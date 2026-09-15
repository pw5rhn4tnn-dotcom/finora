import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditWriter } from '../audit/audit.module.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  invalid,
  type TransactionExportQuery,
  type TransactionInput,
  type TransactionPatch,
  type TransactionQuery,
} from '../finance/validation.js';
import { lockOwner, notFound } from '../finance/locking.js';
import {
  transactionView,
  transactionSnapshot,
} from '../finance/serialization.js';
import { financialSnapshot } from '../finance/money.js';
import { serializeCsv } from '../imports/csv.js';

// Общий batch size постраничного (keyset) чтения экспорта: держит память и
// длительность каждого отдельного запроса ограниченными независимо от
// суммарного числа подходящих под фильтр записей (ARCHITECTURE §15/§17,
// §25 — пачки без загрузки всей истории разом).
const EXPORT_BATCH_SIZE = 2000;

function buildFilter(q: TransactionQuery | TransactionExportQuery) {
  // Экранируем LIKE metacharacters: поиск буквальный, параметризованный Prisma.
  const search = q.search?.replace(/[\\%_]/g, '\\$&');
  const where: Prisma.TransactionWhereInput = {
    ...(q.type !== 'ALL' ? { type: q.type } : {}),
    ...(q.categoryId ? { categoryId: q.categoryId } : {}),
    ...(q.currency ? { currency: q.currency } : {}),
    ...(q.dateFrom || q.dateTo
      ? {
          transactionDate: {
            ...(q.dateFrom ? { gte: new Date(q.dateFrom) } : {}),
            ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
          },
        }
      : {}),
    ...(q.amountMin || q.amountMax
      ? {
          amountInBaseCurrency: {
            ...(q.amountMin ? { gte: q.amountMin } : {}),
            ...(q.amountMax ? { lte: q.amountMax } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { description: { contains: search, mode: 'insensitive' } },
            { category: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.TransactionOrderByWithRelationInput[] =
    q.sort === 'newest'
      ? [{ transactionDate: 'desc' }, { id: 'desc' }]
      : q.sort === 'oldest'
        ? [{ transactionDate: 'asc' }, { id: 'asc' }]
        : [
            { amountInBaseCurrency: q.sort === 'amountAsc' ? 'asc' : 'desc' },
            { id: 'asc' },
          ];
  return { where, orderBy };
}
const EXPORT_HEADERS = [
  'transactionDate',
  'type',
  'amount',
  'currency',
  'exchangeRate',
  'amountInBaseCurrency',
  'category',
  'description',
  'source',
];
@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriter,
  ) {}
  private async owned(
    db: Prisma.TransactionClient,
    userId: string,
    id: string,
  ) {
    return (
      (await db.transaction.findFirst({
        where: { userId, id },
        include: { category: true },
      })) ?? notFound()
    );
  }
  async get(userId: string, id: string) {
    return transactionView(await this.owned(this.prisma.client, userId, id));
  }
  async list(userId: string, q: TransactionQuery) {
    const { where: filter, orderBy } = buildFilter(q);
    const where: Prisma.TransactionWhereInput = { userId, ...filter };
    return this.prisma.client.$transaction(
      async (db) => ({
        items: (
          await db.transaction.findMany({
            where,
            orderBy,
            skip: (q.page - 1) * q.pageSize,
            take: q.pageSize,
            include: { category: true },
          })
        ).map(transactionView),
        total: await db.transaction.count({ where }),
        page: q.page,
        pageSize: q.pageSize,
      }),
      { isolationLevel: 'RepeatableRead' },
    );
  }
  // Тот же построитель фильтров/сортировки и ownership, что список, но без
  // ограничения текущей страницы; читает совпадающие записи пачками через
  // keyset-курсор по стабильному tie-breaker id того же orderBy (ARCHITECTURE
  // §10, §15, §17). CSV-строки не доверяют ничего, кроме уже сохранённых
  // серверных полей: id/ownerId/createdAt/source не экспортируются как
  // редактируемые данные, category — человекочитаемым именем, не UUID.
  async export(userId: string, q: TransactionExportQuery): Promise<string> {
    const { where: filter, orderBy } = buildFilter(q);
    const where: Prisma.TransactionWhereInput = { userId, ...filter };
    const rows: string[][] = [];
    await this.prisma.client.$transaction(
      async (db) => {
        let cursor: string | undefined;
        for (;;) {
          const batch = await db.transaction.findMany({
            where,
            orderBy,
            take: EXPORT_BATCH_SIZE,
            include: { category: true },
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          });
          for (const row of batch) {
            const view = transactionView(row);
            rows.push([
              view.transactionDate,
              view.type,
              view.amount,
              view.currency,
              view.exchangeRate,
              view.amountInBaseCurrency,
              view.category.name,
              view.description,
              view.source,
            ]);
          }
          if (batch.length < EXPORT_BATCH_SIZE) break;
          cursor = batch[batch.length - 1]!.id;
        }
      },
      { isolationLevel: 'RepeatableRead', timeout: 30_000, maxWait: 10_000 },
    );
    return serializeCsv(EXPORT_HEADERS, rows);
  }
  private async category(
    db: Prisma.TransactionClient,
    userId: string,
    categoryId: string,
    type: TransactionInput['type'],
    previousId?: string,
  ) {
    const category = await db.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!category) invalid('categoryId', 'Категория недоступна');
    if (category.archivedAt && category.id !== previousId)
      invalid('categoryId', 'Архивная категория недоступна для новой связи');
    if (category.type !== type)
      invalid('categoryId', 'Тип категории не соответствует операции');
  }
  async create(userId: string, input: TransactionInput) {
    return this.prisma.client.$transaction(async (db) => {
      const owner = await lockOwner(db, userId);
      await this.category(db, userId, input.categoryId, input.type);
      const money = financialSnapshot(
        input.amount,
        input.currency,
        owner.baseCurrency,
        input.exchangeRate,
      );
      const row = await db.transaction.create({
        data: {
          ...input,
          ...money,
          userId,
          transactionDate: new Date(input.transactionDate),
          source: 'MANUAL',
        },
        include: { category: true },
      });
      await this.audit.write(
        db,
        userId,
        'Transaction',
        row.id,
        'CREATE',
        null,
        transactionSnapshot(row),
      );
      return transactionView(row);
    });
  }
  async update(userId: string, id: string, input: TransactionPatch) {
    return this.prisma.client.$transaction(async (db) => {
      const owner = await lockOwner(db, userId);
      const before = await this.owned(db, userId, id);
      const currency = input.currency ?? before.currency;
      const changedCurrency = currency !== before.currency;
      if (changedCurrency && input.exchangeRate === undefined)
        invalid('exchangeRate', 'При смене валюты укажите курс заново');
      await this.category(
        db,
        userId,
        input.categoryId ?? before.categoryId,
        input.type ?? before.type,
        before.categoryId,
      );
      const money = financialSnapshot(
        input.amount ?? before.amount.toFixed(),
        currency,
        owner.baseCurrency,
        input.exchangeRate ?? before.exchangeRate.toFixed(),
      );
      const after = await db.transaction.update({
        where: { id, userId },
        data: {
          ...input,
          ...money,
          ...(input.transactionDate
            ? { transactionDate: new Date(input.transactionDate) }
            : {}),
        },
        include: { category: true },
      });
      await this.audit.write(
        db,
        userId,
        'Transaction',
        id,
        'UPDATE',
        transactionSnapshot(before),
        transactionSnapshot(after),
      );
      return transactionView(after);
    });
  }
  async remove(userId: string, id: string) {
    await this.prisma.client.$transaction(async (db) => {
      await lockOwner(db, userId);
      const before = await this.owned(db, userId, id);
      await db.transaction.delete({ where: { id, userId } });
      await this.audit.write(
        db,
        userId,
        'Transaction',
        id,
        'DELETE',
        transactionSnapshot(before),
        null,
      );
    });
  }
}
