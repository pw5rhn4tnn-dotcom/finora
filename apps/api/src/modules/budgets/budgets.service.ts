import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type Budget,
  type Category,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Problem } from '../../common/problem.js';
import { AuditWriter } from '../audit/audit.module.js';
import { lockOwner, notFound } from '../finance/locking.js';
import { currencyDigits, invalid } from '../finance/validation.js';
import { categoryView } from '../finance/serialization.js';
import {
  monthRange,
  type BudgetInput,
  type BudgetPatch,
  type BudgetQuery,
} from './budgets.validation.js';

const Decimal = Prisma.Decimal.clone({ precision: 60 });
type BudgetRow = Budget & { category: Category };
function snapshot(row: BudgetRow) {
  return {
    id: row.id,
    userId: row.userId,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    year: row.year,
    month: row.month,
    limitAmount: row.limitAmount.toFixed(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export function budgetUsage(limitAmount: string, spentAmount: string) {
  const limit = new Decimal(limitAmount),
    spent = new Decimal(spentAmount);
  const remaining = limit.minus(spent);
  return {
    spent: spent.toFixed(),
    remaining: remaining.toFixed(),
    overBudget: remaining.lt(0),
    progress: spent
      .div(limit)
      .mul(100)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toFixed(2),
  };
}
@Injectable()
export class BudgetsService {
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
      (await db.budget.findFirst({
        where: { userId, id },
        include: { category: true },
      })) ?? notFound()
    );
  }
  private async views(
    db: Prisma.TransactionClient,
    userId: string,
    rows: BudgetRow[],
    year: number,
    month: number,
  ) {
    // Один GROUP BY на страницу, без загрузки транзакций в Node и без N+1.
    const sums = rows.length
      ? await db.transaction.groupBy({
          by: ['categoryId'],
          where: {
            userId,
            type: 'EXPENSE',
            categoryId: { in: rows.map((r) => r.categoryId) },
            transactionDate: monthRange(year, month),
          },
          _sum: { amountInBaseCurrency: true },
        })
      : [];
    const spent = new Map(
      sums.map((s) => [
        s.categoryId,
        s._sum.amountInBaseCurrency?.toFixed() ?? '0',
      ]),
    );
    const owner = await db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { baseCurrency: true },
    });
    return rows.map((row) => {
      const data = {
        id: row.id,
        categoryId: row.categoryId,
        year: row.year,
        month: row.month,
        limitAmount: row.limitAmount.toFixed(),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
      return {
        ...data,
        category: categoryView(row.category),
        currency: owner.baseCurrency,
        ...budgetUsage(data.limitAmount, spent.get(row.categoryId) ?? '0'),
      };
    });
  }
  async list(userId: string, q: BudgetQuery) {
    return this.prisma.client.$transaction(
      async (db) => {
        const where = { userId, year: q.year, month: q.month };
        const rows = await db.budget.findMany({
          where,
          include: { category: true },
          orderBy: [{ category: { name: 'asc' } }, { id: 'asc' }],
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
        });
        return {
          items: await this.views(db, userId, rows, q.year, q.month),
          total: await db.budget.count({ where }),
          page: q.page,
          pageSize: q.pageSize,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async get(userId: string, id: string) {
    return this.prisma.client.$transaction(
      async (db) => {
        const row = await this.owned(db, userId, id);
        return (await this.views(db, userId, [row], row.year, row.month))[0]!;
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  private async validate(
    db: Prisma.TransactionClient,
    userId: string,
    input: BudgetInput,
    currency: string,
    before?: BudgetRow,
  ) {
    const category = await db.category.findFirst({
      where: { userId, id: input.categoryId },
    });
    if (!category) invalid('categoryId', 'Категория недоступна');
    if (category.type !== 'EXPENSE')
      invalid('categoryId', 'Бюджет доступен только для категории расходов');
    if (
      category.archivedAt &&
      !(
        before?.categoryId === category.id &&
        before.year === input.year &&
        before.month === input.month
      )
    )
      invalid(
        'categoryId',
        'Архивная категория недоступна для нового бюджета или периода',
      );
    const amount = new Decimal(input.limitAmount);
    if (!amount.isFinite() || !amount.gt(0) || amount.gte('10000000000000000'))
      invalid(
        'limitAmount',
        'Укажите положительный лимит в допустимом диапазоне',
      );
    if (amount.decimalPlaces() > currencyDigits(currency))
      invalid(
        'limitAmount',
        `Для ${currency} допустимо ${currencyDigits(currency)} дробных знаков`,
      );
  }
  private async mutation<T>(run: (db: Prisma.TransactionClient) => Promise<T>) {
    try {
      return await this.prisma.client.$transaction(run);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        error.meta?.['modelName'] === 'Budget'
      )
        throw new Problem(
          409,
          'conflict',
          'Бюджет этой категории на выбранный месяц уже существует',
          { categoryId: ['Выберите другую категорию или месяц'] },
        );
      throw error;
    }
  }
  async create(userId: string, input: BudgetInput) {
    return this.mutation(async (db) => {
      const owner = await lockOwner(db, userId);
      await this.validate(db, userId, input, owner.baseCurrency);
      const row = await db.budget.create({
        data: { ...input, userId },
        include: { category: true },
      });
      await this.audit.write(
        db,
        userId,
        'Budget',
        row.id,
        'CREATE',
        null,
        snapshot(row),
      );
      return (await this.views(db, userId, [row], row.year, row.month))[0]!;
    });
  }
  async update(userId: string, id: string, input: BudgetPatch) {
    return this.mutation(async (db) => {
      const owner = await lockOwner(db, userId);
      const before = await this.owned(db, userId, id);
      const data = {
        categoryId: before.categoryId,
        year: before.year,
        month: before.month,
        limitAmount: before.limitAmount.toFixed(),
        ...input,
      };
      await this.validate(db, userId, data, owner.baseCurrency, before);
      const row = await db.budget.update({
        where: { id, userId },
        data,
        include: { category: true },
      });
      await this.audit.write(
        db,
        userId,
        'Budget',
        id,
        'UPDATE',
        snapshot(before),
        snapshot(row),
      );
      return (await this.views(db, userId, [row], row.year, row.month))[0]!;
    });
  }
  async remove(userId: string, id: string) {
    await this.mutation(async (db) => {
      await lockOwner(db, userId);
      const before = await this.owned(db, userId, id);
      await db.budget.delete({ where: { id, userId } });
      await this.audit.write(
        db,
        userId,
        'Budget',
        id,
        'DELETE',
        snapshot(before),
        null,
      );
    });
  }
}
