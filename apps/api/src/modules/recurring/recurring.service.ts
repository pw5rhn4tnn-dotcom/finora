import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditWriter } from '../audit/audit.module.js';
import { Problem } from '../../common/problem.js';
import { lockOwner, notFound } from '../finance/locking.js';
import { invalid } from '../finance/validation.js';
import { financialSnapshot } from '../finance/money.js';
import { categoryView, recurringSnapshot } from '../finance/serialization.js';
import {
  businessDateString,
  calendarDateInZone,
  clampCalendarDate,
  fromBusinessDate,
  nextMonthlyOccurrence,
  toBusinessDate,
} from './calendar.js';
import { catchUpRule } from './engine.js';
import { Clock } from './clock.js';
import type {
  RecurringInput,
  RecurringPatch,
  RecurringQuery,
} from './recurring.validation.js';

type RuleRow = Prisma.RecurringTransactionGetPayload<{
  include: { category: true };
}>;

function businessDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

@Injectable()
export class RecurringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriter,
    private readonly clock: Clock,
  ) {}

  private async owned(
    db: Prisma.TransactionClient,
    userId: string,
    id: string,
  ) {
    return (
      (await db.recurringTransaction.findFirst({
        where: { userId, id },
        include: { category: true },
      })) ?? notFound()
    );
  }
  private async hasGenerated(
    db: Prisma.TransactionClient,
    userId: string,
    id: string,
  ) {
    return !!(await db.transaction.findFirst({
      where: { userId, recurringTransactionId: id },
      select: { id: true },
    }));
  }
  private async view(db: Prisma.TransactionClient, row: RuleRow) {
    return {
      id: row.id,
      category: categoryView(row.category),
      type: row.type,
      amount: row.amount.toFixed(),
      currency: row.currency,
      exchangeRate: row.exchangeRate.toFixed(),
      description: row.description,
      frequency: row.frequency,
      dayOfMonth: row.dayOfMonth,
      startDate: businessDateString(row.startDate),
      endDate: row.endDate ? businessDateString(row.endDate) : null,
      nextOccurrenceDate: businessDateString(row.nextOccurrenceDate),
      archivedAt: row.archivedAt?.toISOString() ?? null,
      hasGeneratedTransactions: await this.hasGenerated(db, row.userId, row.id),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
  async list(userId: string, q: RecurringQuery) {
    const where = {
      userId,
      ...(q.state === 'all'
        ? {}
        : { archivedAt: q.state === 'active' ? null : { not: null } }),
    };
    return this.prisma.client.$transaction(
      async (db) => {
        const rows = await db.recurringTransaction.findMany({
          where,
          include: { category: true },
          orderBy: [{ nextOccurrenceDate: 'asc' }, { id: 'asc' }],
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
        });
        return {
          items: await Promise.all(rows.map((row) => this.view(db, row))),
          total: await db.recurringTransaction.count({ where }),
          page: q.page,
          pageSize: q.pageSize,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async get(userId: string, id: string) {
    return this.prisma.client.$transaction(async (db) => {
      const row = await this.owned(db, userId, id);
      return this.view(db, row);
    });
  }
  private async checkCategory(
    db: Prisma.TransactionClient,
    userId: string,
    categoryId: string,
    type: 'INCOME' | 'EXPENSE',
  ) {
    const category = await db.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!category) invalid('categoryId', 'Категория недоступна');
    if (category.archivedAt)
      invalid('categoryId', 'Архивная категория недоступна для нового правила');
    if (category.type !== type)
      invalid('categoryId', 'Тип категории не соответствует операции');
    return category;
  }
  async create(userId: string, input: RecurringInput) {
    return this.prisma.client.$transaction(async (db) => {
      const owner = await lockOwner(db, userId);
      const category = await this.checkCategory(
        db,
        userId,
        input.categoryId,
        input.type,
      );
      const money = financialSnapshot(
        input.amount,
        input.currency,
        owner.baseCurrency,
        input.exchangeRate,
      );
      const start = businessDate(input.startDate);
      const dayOfMonth = fromBusinessDate(start).day;
      const row = await db.recurringTransaction.create({
        data: {
          userId,
          categoryId: input.categoryId,
          type: input.type,
          amount: money.amount,
          currency: input.currency,
          exchangeRate: money.exchangeRate,
          description: input.description,
          frequency: 'MONTHLY',
          dayOfMonth,
          startDate: start,
          endDate: input.endDate ? businessDate(input.endDate) : null,
          nextOccurrenceDate: start,
        },
        include: { category: true },
      });
      await this.audit.write(
        db,
        userId,
        'RecurringTransaction',
        row.id,
        'CREATE',
        null,
        recurringSnapshot(row, category.name),
      );
      return this.view(db, row);
    });
  }
  async update(userId: string, id: string, input: RecurringPatch) {
    // Перед применением изменений правило обязано полностью догнать долг по
    // ПРЕЖНИМ параметрам: смена dayOfMonth/endDate не должна затрагивать ещё
    // не восстановленные прошлые occurrence (ARCHITECTURE §14).
    await catchUpRule(this.prisma, this.audit, userId, id, this.clock.now());
    return this.prisma.client.$transaction(async (db) => {
      const owner = await lockOwner(db, userId);
      await db.$queryRaw`SELECT id FROM recurring_transactions WHERE id = ${id}::uuid AND "userId" = ${userId}::uuid FOR UPDATE`;
      const before = await this.owned(db, userId, id);
      if (before.archivedAt)
        throw new Problem(
          409,
          'conflict',
          'Архивное правило нельзя редактировать',
        );
      const categoryId = input.categoryId ?? before.categoryId;
      const type = input.type ?? before.type;
      const category = await this.checkCategory(db, userId, categoryId, type);
      const currency = input.currency ?? before.currency;
      if (currency !== before.currency && input.exchangeRate === undefined)
        invalid('exchangeRate', 'При смене валюты укажите курс заново');
      const money = financialSnapshot(
        input.amount ?? before.amount.toFixed(),
        currency,
        owner.baseCurrency,
        input.exchangeRate ?? before.exchangeRate.toFixed(),
      );
      const today = calendarDateInZone(this.clock.now(), owner.timeZone);
      let nextOccurrenceDate = before.nextOccurrenceDate;
      const dayOfMonth = input.dayOfMonth ?? before.dayOfMonth;
      if (dayOfMonth !== before.dayOfMonth) {
        const { year, month } = fromBusinessDate(nextOccurrenceDate);
        let candidate = toBusinessDate(
          clampCalendarDate(year, month, dayOfMonth),
        );
        if (candidate <= today)
          candidate = nextMonthlyOccurrence(candidate, dayOfMonth);
        nextOccurrenceDate = candidate;
      }
      const endDate =
        input.endDate === undefined
          ? before.endDate
          : input.endDate === null
            ? null
            : businessDate(input.endDate);
      if (endDate && endDate < before.startDate)
        invalid('endDate', 'Дата окончания раньше даты начала правила');
      const exhausted = !!endDate && nextOccurrenceDate > endDate;
      const after = await db.recurringTransaction.update({
        where: { id, userId },
        data: {
          categoryId,
          type,
          amount: money.amount,
          currency,
          exchangeRate: money.exchangeRate,
          description: input.description ?? before.description,
          dayOfMonth,
          endDate,
          nextOccurrenceDate,
          ...(exhausted ? { archivedAt: this.clock.now() } : {}),
        },
        include: { category: true },
      });
      await this.audit.write(
        db,
        userId,
        'RecurringTransaction',
        id,
        exhausted ? 'ARCHIVE' : 'UPDATE',
        recurringSnapshot(before, category.name),
        recurringSnapshot(after, category.name),
      );
      return this.view(db, after);
    });
  }
  async remove(userId: string, id: string) {
    return this.prisma.client.$transaction(async (db) => {
      await lockOwner(db, userId);
      const before = await this.owned(db, userId, id);
      if (await this.hasGenerated(db, userId, id)) {
        if (before.archivedAt) return { outcome: 'archived' as const };
        const archivedAt = new Date();
        const after = await db.recurringTransaction.update({
          where: { id, userId },
          data: { archivedAt },
          include: { category: true },
        });
        await this.audit.write(
          db,
          userId,
          'RecurringTransaction',
          id,
          'ARCHIVE',
          recurringSnapshot(before, before.category.name),
          recurringSnapshot(after, before.category.name),
        );
        return { outcome: 'archived' as const };
      }
      await db.recurringTransaction.delete({ where: { id, userId } });
      await this.audit.write(
        db,
        userId,
        'RecurringTransaction',
        id,
        'DELETE',
        recurringSnapshot(before, before.category.name),
        null,
      );
      return { outcome: 'deleted' as const };
    });
  }
}
