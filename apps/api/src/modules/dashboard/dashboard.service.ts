import { Injectable } from '@nestjs/common';
import type { Category } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { categoryView } from '../finance/serialization.js';
import { budgetUsage } from '../budgets/budgets.service.js';
import { monthRange } from '../budgets/budgets.validation.js';
import {
  Decimal,
  dashboardMonths,
  insights,
  totals,
} from './dashboard-calculations.js';
import type { DashboardDto } from './dashboard.dto.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}
  async get(
    userId: string,
    q: { year: number; month: number },
  ): Promise<DashboardDto> {
    const months = dashboardMonths(q.year, q.month);
    const selected = monthRange(q.year, q.month);
    const from = monthRange(months[0]!.year, months[0]!.month).gte;
    return this.prisma.client.$transaction(
      async (db) => {
        // Не более пяти SELECT независимо от количества операций/категорий/месяцев.
        // Первый SELECT фиксирует снимок, валюта и все блоки читаются из него.
        const owner = await db.user.findUniqueOrThrow({
          where: { id: userId },
          select: { baseCurrency: true },
        });
        const monthly = await db.$queryRaw<
          { year: number; month: number; income: string; expense: string }[]
        >`
        SELECT EXTRACT(YEAR FROM "transactionDate")::int AS year,
               EXTRACT(MONTH FROM "transactionDate")::int AS month,
               COALESCE(SUM("amountInBaseCurrency") FILTER (WHERE type = 'INCOME'), 0)::text AS income,
               COALESCE(SUM("amountInBaseCurrency") FILTER (WHERE type = 'EXPENSE'), 0)::text AS expense
        FROM "transactions"
        WHERE "userId" = ${userId}::uuid AND "transactionDate" >= ${from} AND "transactionDate" < ${selected.lt}
        GROUP BY 1, 2`;
        const categories = await db.$queryRaw<
          (Category & { amount: string })[]
        >`
        SELECT c.*, SUM(t."amountInBaseCurrency")::text AS amount
        FROM "transactions" t JOIN "categories" c ON c.id = t."categoryId" AND c."userId" = t."userId"
        WHERE t."userId" = ${userId}::uuid AND c."userId" = ${userId}::uuid AND t.type = 'EXPENSE'
          AND t."transactionDate" >= ${selected.gte} AND t."transactionDate" < ${selected.lt}
        GROUP BY c.id ORDER BY SUM(t."amountInBaseCurrency") DESC, c.id ASC`;
        const rows = await db.budget.findMany({
          where: { userId, year: q.year, month: q.month },
          include: { category: true },
          orderBy: { id: 'asc' },
        });
        const trend = months.map((m) => {
          const row = monthly.find(
            (r) => r.year === m.year && r.month === m.month,
          );
          return {
            ...m,
            ...totals(row?.income ?? '0', row?.expense ?? '0', !!row),
          };
        });
        const current = trend[5]!;
        const distribution = categories.map((c) => ({
          category: categoryView(c),
          amount: new Decimal(c.amount).toFixed(),
          share: new Decimal(current.expense).isZero()
            ? '0.00'
            : new Decimal(c.amount).div(current.expense).mul(100).toFixed(2),
        }));
        const spent = new Map(
          distribution.map((c) => [c.category.id, c.amount]),
        );
        const budgets = rows.map((b) => ({
          id: b.id,
          categoryId: b.categoryId,
          category: categoryView(b.category),
          year: b.year,
          month: b.month,
          limitAmount: b.limitAmount.toFixed(),
          currency: owner.baseCurrency,
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt.toISOString(),
          ...budgetUsage(
            b.limitAmount.toFixed(),
            spent.get(b.categoryId) ?? '0',
          ),
        }));
        const data = {
          ...current,
          currency: owner.baseCurrency,
          trend,
          distribution,
          topCategories: distribution.slice(0, 5),
          budgets,
        };
        return { ...data, insights: insights(data, trend[4]!) };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
}
