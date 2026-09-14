import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditWriter } from '../audit/audit.module.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  invalid,
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
    // Экранируем LIKE metacharacters: поиск буквальный, параметризованный Prisma.
    const search = q.search?.replace(/[\\%_]/g, '\\$&');
    const where: Prisma.TransactionWhereInput = {
      userId,
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
