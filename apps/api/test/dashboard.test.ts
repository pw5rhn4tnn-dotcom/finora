import { TransactionsService } from '../src/modules/transactions/transactions.service.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { bootstrap } from '../src/bootstrap.js';
import { databaseFixture } from './database-fixture.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { SessionService } from '../src/modules/auth/session.service.js';
import { DashboardService } from '../src/modules/dashboard/dashboard.service.js';
import {
  dashboardMonths,
  dashboardQuery,
  insights,
  totals,
} from '../src/modules/dashboard/dashboard-calculations.js';
import { seedDatabase } from '../prisma/seed-database.js';
import { seedId } from '../prisma/seed-data.js';
import type {
  DashboardDto,
  DashboardCategoryDto,
} from '../src/modules/dashboard/dashboard.dto.js';
import { budgetUsage } from '../src/modules/budgets/budgets.service.js';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

await test('Dashboard Decimal: zero income, отрицательный net, HALF_UP, агрегат выше safe integer', () => {
  assert.deepEqual(totals('0', '0.1', true), {
    income: '0',
    expense: '0.1',
    net: '-0.1',
    savingsRate: null,
    hasTransactions: true,
  });
  assert.equal(totals('3', '2', true).savingsRate, '33.33');
  assert.equal(totals('8', '7.99', true).savingsRate, '0.13');
  assert.equal(
    totals('999999999999999999999.99', '999999999999999999999.98', true).net,
    '0.01',
  );
  assert.equal(totals('1', '2', true).savingsRate, '-100.00');
});
await test('Dashboard: ровно шесть DATE месяцев, переход года и строгие границы query', () => {
  assert.deepEqual(
    dashboardMonths(2024, 2).map((m) => `${m.year}-${m.month}`),
    ['2023-9', '2023-10', '2023-11', '2023-12', '2024-1', '2024-2'],
  );
  for (const q of [
    {},
    { year: '2026', month: '01' },
    { year: '0', month: '1' },
    { year: '10000', month: '1' },
    { year: '2026', month: '13' },
    { year: '2026', month: ['1', '2'] },
    { year: '2026', month: '1', userId: randomUUID() },
    { year: '1', month: '5' },
  ])
    assert.equal(dashboardQuery.safeParse(q).success, false);
  for (const q of [
    { year: '1', month: '6' },
    { year: '99', month: '1' },
    { year: '9999', month: '12' },
  ])
    assert.equal(dashboardQuery.safeParse(q).success, true);
});
await test('Insights: точные пороги, приоритеты, отсутствие выдуманного сравнения', () => {
  const previous = totals('100', '50', true);
  const input = { ...totals('100', '60', true), budgets: [], distribution: [] };
  assert.deepEqual(
    insights(input, previous).map((i) => i.code),
    ['EXPENSE_UP', 'SAVINGS_DOWN'],
  );
  assert.deepEqual(insights({ ...input, expense: '59.999' }, previous), []);
  assert.deepEqual(
    insights({ ...input, expense: '40' }, previous).map((i) => i.code),
    ['SAVINGS_UP', 'EXPENSE_DOWN'],
  );
  assert.deepEqual(insights(input, totals('0', '0', false)), []);
  assert.deepEqual(
    insights(
      { ...input, income: '0', expense: '0', hasTransactions: false },
      previous,
    ),
    [],
  );
});

await test('Stage 7: Dashboard HTTP / PostgreSQL / снимок / объём', async (t) => {
  const fixture = await databaseFixture();
  const previousEnv = { ...process.env };
  Object.assign(process.env, {
    DATABASE_URL: fixture.runtimeUrl,
    AUTH_SECRET: 'finora-stage7-integration-secret-32bytes',
    AUTH_ORIGINS: 'http://finora.test',
    AUTH_COOKIE_SECURE: 'false',
  });
  const app = await bootstrap(0);
  const db = fixture.client;
  const service = app.get(DashboardService);
  const prisma = app.get(PrismaService);
  const originalClient = prisma.client;
  const queries: string[] = [];
  const logged = new PrismaClient({
    adapter: new PrismaPg({ connectionString: fixture.runtimeUrl }),
    log: [{ emit: 'event', level: 'query' }],
  });
  logged.$on('query', (event) => queries.push(event.query));
  Object.defineProperty(prisma, 'client', {
    value: logged,
    configurable: true,
  });
  try {
    await seedDatabase(db, '2026-09-01');
    const owner = seedId('personal'),
      other = seedId('family');
    const token = await app.get(SessionService).sign(owner);
    const base = `${await app.getUrl()}/api/v1/dashboard`;
    const get = (query: string, cookie = `finora_session=${token}`) =>
      fetch(`${base}${query}`, { headers: { Cookie: cookie } });
    await t.test(
      '401 закрыт по умолчанию; owner/неизвестные/повторные/невалидные параметры → Problem 400',
      async () => {
        assert.equal((await get('?year=2026&month=9', '')).status, 401);
        for (const q of [
          '',
          '?year=2026',
          '?year=2026&month=09',
          '?year=2026&month=13',
          '?year=0&month=1',
          '?year=10000&month=1',
          '?year=2026&month=9&month=8',
          `?year=2026&month=9&userId=${other}`,
          '?year=2026&month=9&page=1',
          '?year=1&month=5',
        ]) {
          const r = await get(q);
          assert.equal(r.status, 400, q);
          const body = await r.text();
          assert.match(body, /traceId/);
          assert.doesNotMatch(body, /SELECT|passwordHash|Prisma/);
        }
      },
    );
    await t.test(
      'seed: все блоки согласованы, разные пользователи, Top-5 и бюджетная семантика',
      async () => {
        const personal = await service.get(owner, { year: 2026, month: 9 });
        const family = await service.get(other, { year: 2026, month: 9 });
        assert.equal((await get('?year=2026&month=9')).status, 200);
        assert.equal(personal.income, '118500');
        assert.equal(personal.trend.length, 6);
        assert.equal(personal.topCategories.length, 5);
        assert.deepEqual(
          personal.topCategories,
          personal.distribution.slice(0, 5),
        );
        assert.ok(
          personal.insights.length >= 2 && personal.insights.length <= 4,
        );
        assert.notEqual(family.expense, personal.expense);
        assert.ok(
          personal.distribution.every(
            (c) =>
              !family.distribution.some((f) => f.category.id === c.category.id),
          ),
        );
        for (const b of personal.budgets)
          assert.deepEqual(
            {
              spent: b.spent,
              remaining: b.remaining,
              overBudget: b.overBudget,
              progress: b.progress,
            },
            budgetUsage(
              b.limitAmount,
              personal.distribution.find((c) => c.category.id === b.categoryId)
                ?.amount ?? '0',
            ),
          );
        assert.doesNotMatch(
          JSON.stringify(personal),
          /userId|passwordHash|exchangeRate|description.*seed/i,
        );
      },
    );
    const category = await db.category.create({
      data: {
        userId: owner,
        name: 'Stage 7 decimals',
        type: 'EXPENSE',
        icon: 'wallet',
        color: '#4338A3',
      },
    });
    const incomeCategory = seedId('personal:category:salary');
    const transaction = async (
      amount: string,
      date: string,
      categoryId = category.id,
      userId = owner,
      type: 'INCOME' | 'EXPENSE' = 'EXPENSE',
    ) =>
      db.transaction.create({
        data: {
          userId,
          categoryId,
          type,
          amount,
          amountInBaseCurrency: amount,
          currency: 'RUB',
          exchangeRate: '1',
          transactionDate: new Date(`${date}T00:00:00Z`),
          description: 'Stage 7 independent data',
          source: 'MANUAL',
        },
      });
    const first = await transaction('0.1', '2024-02-01');
    await transaction('0.2', '2024-02-29');
    await transaction('1', '2024-02-29', incomeCategory, owner, 'INCOME');
    await transaction('999', '2024-03-01');
    await transaction(
      '555',
      '2024-02-29',
      seedId('family:category:groceries'),
      other,
    );
    await db.budget.create({
      data: {
        userId: owner,
        categoryId: category.id,
        year: 2024,
        month: 2,
        limitAmount: '0.3',
      },
    });
    await t.test(
      'DATE leap/end exclusive, decimal 0.1+0.2, архивная категория; смена timezone не переносит операции',
      async () => {
        await db.category.update({
          where: { id: category.id },
          data: { archivedAt: new Date(), name: 'Исторические расходы' },
        });
        for (const zone of ['Pacific/Kiritimati', 'America/Los_Angeles']) {
          await db.user.update({
            where: { id: owner },
            data: { timeZone: zone },
          });
          const data = await service.get(owner, { year: 2024, month: 2 });
          assert.equal(data.expense, '0.3');
          assert.equal(data.net, '0.7');
          assert.equal(data.savingsRate, '70.00');
          assert.equal(data.budgets[0]!.remaining, '0');
          assert.equal(data.budgets[0]!.overBudget, false);
          assert.equal(
            data.distribution[0]!.category.name,
            'Исторические расходы',
          );
          assert.ok(data.distribution[0]!.category.archivedAt);
          assert.equal(data.trend.filter((m) => !m.hasTransactions).length, 5);
        }
        const empty = await service.get(owner, { year: 2030, month: 1 });
        assert.equal(empty.hasTransactions, false);
        assert.equal(empty.savingsRate, null);
        assert.deepEqual(empty.insights, []);
        assert.deepEqual(empty.distribution, []);
        for (const q of [
          { year: 1, month: 6 },
          { year: 99, month: 1 },
          { year: 9999, month: 12 },
        ])
          assert.equal((await service.get(owner, q)).trend.length, 6);
      },
    );
    await t.test(
      'PostgreSQL session TimeZone: DATE границы не смещаются',
      async () => {
        for (const zone of ['Pacific/Kiritimati', 'America/Los_Angeles']) {
          const zoned = new PrismaClient({
            adapter: new PrismaPg({
              connectionString: fixture.runtimeUrl,
              options: `-c timezone=${zone}`,
            }),
          });
          try {
            Object.defineProperty(prisma, 'client', {
              value: zoned,
              configurable: true,
            });
            const setting = await zoned.$queryRaw<
              { zone: string }[]
            >`SELECT current_setting('TimeZone') AS zone`;
            assert.equal(setting[0]!.zone, zone);
            const snapshot = await service.get(owner, { year: 2024, month: 2 });
            assert.equal(snapshot.expense, '0.3', zone);
            assert.equal(snapshot.distribution[0]!.amount, '0.3', zone);
            assert.equal(snapshot.budgets[0]!.spent, '0.3', zone);
          } finally {
            Object.defineProperty(prisma, 'client', {
              value: logged,
              configurable: true,
            });
            await zoned.$disconnect();
          }
        }
      },
    );
    await t.test(
      'CRUD и FX snapshot меняют соответствующие KPI/месяцы/бюджет без stale агрегатов',
      async () => {
        const transactions = app.get(TransactionsService);
        const categoryId = seedId('personal:category:groceries');
        await db.budget.create({
          data: {
            userId: owner,
            categoryId,
            year: 2035,
            month: 4,
            limitAmount: '0.5',
          },
        });
        const row = await transactions.create(owner, {
          categoryId,
          type: 'EXPENSE',
          amount: '0.10',
          currency: 'USD',
          exchangeRate: '3',
          transactionDate: '2035-03-31',
          description: 'Stage 7 FX',
        });
        assert.equal(
          (await service.get(owner, { year: 2035, month: 3 })).expense,
          '0.3',
        );
        await transactions.update(owner, row.id, {
          amount: '0.20',
          transactionDate: '2035-04-01',
        });
        assert.equal(
          (await service.get(owner, { year: 2035, month: 3 })).expense,
          '0',
        );
        const april = await service.get(owner, { year: 2035, month: 4 });
        assert.equal(april.expense, '0.6');
        assert.equal(april.budgets[0]!.remaining, '-0.1');
        assert.equal(april.budgets[0]!.overBudget, true);
        await transactions.update(owner, row.id, {
          type: 'INCOME',
          categoryId: incomeCategory,
        });
        const income = await service.get(owner, { year: 2035, month: 4 });
        assert.equal(income.income, '0.6');
        assert.equal(income.expense, '0');
        assert.equal(income.budgets[0]!.spent, '0');
        await transactions.remove(owner, row.id);
        assert.equal(
          (await service.get(owner, { year: 2035, month: 4 })).hasTransactions,
          false,
        );
      },
    );
    await t.test(
      'Один snapshot: запись между monthly SUM и category SUM не смешивает версии',
      async () => {
        const reached = deferred(),
          release = deferred();
        let held = false;
        const paused = logged.$extends({
          query: {
            async $allOperations({ operation, args, query }) {
              const result: unknown = await query(args);
              if (operation === '$queryRaw' && !held) {
                held = true;
                reached.resolve();
                await release.promise;
              }
              return result;
            },
          },
        });
        Object.defineProperty(prisma, 'client', {
          value: paused,
          configurable: true,
        });
        const pending = service.get(owner, { year: 2024, month: 2 });
        try {
          await reached.promise;
          await db.transaction.update({
            where: { id: first.id },
            data: { amount: '0.5', amountInBaseCurrency: '0.5' },
          });
        } finally {
          release.resolve();
        }
        const old = await pending;
        Object.defineProperty(prisma, 'client', {
          value: logged,
          configurable: true,
        });
        assert.equal(old.expense, '0.3');
        assert.equal(old.distribution[0]!.amount, '0.3');
        assert.equal(old.budgets[0]!.spent, '0.3');
        assert.equal(
          (await service.get(owner, { year: 2024, month: 2 })).expense,
          '0.7',
        );
      },
    );
    await t.test(
      'Точный агрегат большого объёма, постоянные SELECT, SQL GROUP BY, устойчивые равные суммы',
      async () => {
        const ids = (
          await db.category.createManyAndReturn({
            data: Array.from({ length: 8 }, (_, i) => ({
              userId: owner,
              name: `Stage 7 tie ${i}`,
              type: 'EXPENSE' as const,
              icon: 'wallet',
              color: '#4338A3',
            })),
          })
        )
          .map((c) => c.id)
          .sort();
        await db.transaction.createMany({
          data: Array.from({ length: 10000 }, (_, i) => ({
            userId: owner,
            categoryId: ids[i % 8]!,
            type: 'EXPENSE' as const,
            amount: '9999999999999999.99',
            amountInBaseCurrency: '9999999999999999.99',
            currency: 'RUB',
            exchangeRate: '1',
            transactionDate: new Date('2034-12-31T00:00:00Z'),
            description: 'Stage 7 volume',
            source: 'MANUAL' as const,
          })),
        });
        queries.length = 0;
        const started = performance.now();
        const large = await service.get(owner, { year: 2034, month: 12 });
        t.diagnostic(
          `10000 операций: ${(performance.now() - started).toFixed(1)} ms, SELECT=${queries.filter((q) => /^SELECT/i.test(q.trim())).length}`,
        );
        assert.equal(large.expense, '99999999999999999900');
        assert.deepEqual(
          large.topCategories.map((c) => c.category.id),
          ids.slice(0, 5),
        );
        assert.ok(queries.filter((q) => /^SELECT/i.test(q.trim())).length <= 5);
        const txQueries = queries.filter((q) => /FROM "transactions"/.test(q));
        assert.equal(txQueries.length, 2);
        assert.ok(txQueries.every((q) => /GROUP BY/i.test(q)));
        // Уровень изоляции проверен наблюдаемым snapshot-тестом выше: adapter не логирует SET.
        const plan = await db.$queryRaw<
          { 'QUERY PLAN': unknown }[]
        >`EXPLAIN (ANALYZE, FORMAT JSON) SELECT "categoryId", SUM("amountInBaseCurrency") FROM transactions WHERE "userId" = ${owner}::uuid AND "transactionDate" >= DATE '2034-12-01' AND "transactionDate" < DATE '2035-01-01' GROUP BY "categoryId"`;
        t.diagnostic(`Aggregate plan: ${JSON.stringify(plan)}`);
      },
    );
    await t.test(
      'Insights: budget near/exact/over и Top-1 порог 30%',
      async () => {
        const data = await service.get(owner, { year: 2024, month: 2 });
        const b = data.budgets[0]!;
        const withSpent = (spent: string): DashboardDto => ({
          ...data,
          budgets: [{ ...b, ...budgetUsage('1', spent), limitAmount: '1' }],
        });
        assert.equal(
          insights(withSpent('0.9'), totals('0', '0', false))[0]!.code,
          'BUDGET_NEAR',
        );
        assert.equal(
          insights(withSpent('1'), totals('0', '0', false))[0]!.code,
          'BUDGET_NEAR',
        );
        assert.equal(
          insights(withSpent('1.00000001'), totals('0', '0', false))[0]!.code,
          'BUDGET_OVER',
        );
        const categoryAmount = (amount: string): DashboardCategoryDto => ({
          ...data.distribution[0]!,
          amount,
          share: '30.00',
        });
        assert.deepEqual(
          insights(
            {
              ...data,
              expense: '100',
              budgets: [],
              distribution: [categoryAmount('29.999')],
            },
            totals('0', '0', false),
          ),
          [],
        );
        assert.equal(
          insights(
            {
              ...data,
              expense: '100',
              budgets: [],
              distribution: [categoryAmount('30')],
            },
            totals('0', '0', false),
          )[0]!.code,
          'LARGEST_CATEGORY',
        );
      },
    );
  } finally {
    Object.defineProperty(prisma, 'client', {
      value: originalClient,
      configurable: true,
    });
    await logged.$disconnect();
    await app.close();
    await fixture.close();
    process.env = previousEnv;
  }
});
