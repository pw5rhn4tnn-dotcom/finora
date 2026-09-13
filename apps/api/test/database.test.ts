import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test } from 'node:test';
import pg from 'pg';
import { Prisma } from '../src/generated/prisma/client.js';
import { createDatabaseClient } from '../src/prisma/client.js';
import { seedDatabase } from '../prisma/seed-database.js';
import {
  completionId,
  demoPasswordHash,
  demoProfiles,
  seedId,
} from '../prisma/seed-data.js';
import { databaseFixture } from './database-fixture.js';

const tables = [
  'users',
  'categories',
  'transactions',
  'budgets',
  'recurring_transactions',
  'audit_entries',
] as const;
async function digest(url: string) {
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  try {
    const hash = createHash('sha256');
    for (const table of tables) {
      const rows = await db.query<{ row: string }>(
        `SELECT row_to_json(t)::text AS row FROM (SELECT * FROM ${table} ORDER BY id) t`,
      );
      hash.update(JSON.stringify(rows.rows));
    }
    return hash.digest('hex');
  } finally {
    await db.end();
  }
}

await test('PostgreSQL: migrations, constraints и demo-набор', async (t) => {
  const fixture = await databaseFixture();
  const { client } = fixture;
  try {
    await t.test(
      'миграция создаёт все таблицы в пустой БД и повторно применима',
      async () => {
        for (const table of tables) {
          const count = await client.$queryRawUnsafe<{ count: bigint }[]>(
            `SELECT count(*) FROM ${table}`,
          );
          assert.equal(count[0]?.count, 0n);
        }
        await promisify(execFile)(
          'pnpm',
          ['exec', 'prisma', 'migrate', 'deploy'],
          {
            env: {
              ...process.env,
              MIGRATION_DATABASE_URL: fixture.migrationUrl,
            },
          },
        );
        const columns = await client.$queryRaw<
          { numeric_precision: number; numeric_scale: number }[]
        >`SELECT numeric_precision, numeric_scale FROM information_schema.columns WHERE table_name='transactions' AND column_name='amount'`;
        assert.deepEqual(columns, [
          { numeric_precision: 24, numeric_scale: 8 },
        ]);
      },
    );
    await t.test(
      'ошибка в середине первого seed откатывает все созданные записи',
      async () => {
        const existing = await client.user.create({
          data: {
            email: 'family@finora.example',
            passwordHash: 'fixture',
            displayName: 'Конфликтующий тестовый профиль',
            baseCurrency: 'RUB',
            timeZone: 'Europe/Moscow',
            themePreference: 'light',
          },
        });
        await assert.rejects(seedDatabase(client, '2026-09-01'));
        assert.equal(await client.user.count(), 1);
        assert.equal(await client.transaction.count(), 0);
        assert.equal(await client.category.count(), 0);
        assert.equal(await client.auditEntry.count(), 0);
        await client.user.delete({ where: { id: existing.id } });
      },
    );
    await t.test('параллельные seed атомарно создают один набор', async () => {
      const other = createDatabaseClient(fixture.runtimeUrl);
      try {
        const results = await Promise.all([
          seedDatabase(client, '2026-09-01'),
          seedDatabase(other, '2026-09-01'),
        ]);
        assert.equal(results.filter((r) => r.initialized).length, 1);
      } finally {
        await other.$disconnect();
      }
      const counts = await Promise.all([
        client.user.count(),
        client.category.count(),
        client.transaction.count(),
        client.budget.count(),
        client.recurringTransaction.count(),
        client.auditEntry.count(),
      ]);
      assert.deepEqual(counts, [2, 16, 288, 16, 6, 364]);
      const currencies = await client.transaction.findMany({
        distinct: ['currency'],
        select: { currency: true },
        orderBy: { currency: 'asc' },
      });
      assert.deepEqual(
        currencies.map((c) => c.currency),
        ['EUR', 'RUB', 'USD'],
      );
      const span = await client.transaction.aggregate({
        _min: { transactionDate: true },
        _max: { transactionDate: true },
      });
      assert.equal(
        span._min.transactionDate?.toISOString().slice(0, 7),
        '2026-04',
      );
      assert.equal(
        span._max.transactionDate?.toISOString().slice(0, 7),
        '2026-09',
      );
      for (const profile of demoProfiles) {
        const user = await client.user.findUniqueOrThrow({
          where: { id: seedId(profile.key) },
        });
        assert.equal(
          user.passwordHash,
          demoPasswordHash(profile.key, profile.password),
        );
      }
    });
    await t.test(
      'seed ×3 не меняет ни одной строки и сохраняет исходную временную опору',
      async () => {
        const before = await digest(fixture.runtimeUrl);
        for (let i = 0; i < 3; i++)
          assert.deepEqual(await seedDatabase(client, '2030-01-01'), {
            initialized: false,
            anchor: '2026-09-01',
          });
        assert.equal(await digest(fixture.runtimeUrl), before);
      },
    );
    await t.test(
      'новая БД с той же опорой получает побайтно эквивалентный dataset',
      async () => {
        const second = await databaseFixture();
        try {
          await seedDatabase(second.client, '2026-09-01');
          assert.equal(
            await digest(second.runtimeUrl),
            await digest(fixture.runtimeUrl),
          );
        } finally {
          await second.close();
        }
      },
    );
    const original = await client.transaction.findFirstOrThrow({
      where: { source: 'MANUAL' },
    });
    const clone = {
      ...original,
      id: randomUUID(),
      recurringTransactionId: null,
      recurringOccurrenceDate: null,
    };
    await t.test(
      'decimal сохраняет восемь знаков и сумму выше безопасного JS integer',
      async () => {
        const amount = '9999999999999999.12345678';
        const row = await client.transaction.create({
          data: {
            ...clone,
            id: randomUUID(),
            amount,
            amountInBaseCurrency: amount,
            exchangeRate: '1.123456789012',
          },
        });
        assert.equal(row.amount.toFixed(8), amount);
        assert.equal(row.exchangeRate.toFixed(12), '1.123456789012');
        await client.transaction.delete({ where: { id: row.id } });
        await assert.rejects(
          client.transaction.create({
            data: { ...clone, amount: '10000000000000000' },
          }),
        );
      },
    );
    await t.test(
      'unique бюджета и recurring occurrence гарантируется БД',
      async () => {
        const budget = await client.budget.findFirstOrThrow();
        await assert.rejects(
          client.budget.create({ data: { ...budget, id: randomUUID() } }),
          (e: unknown) =>
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2002',
        );
        const recurring = await client.transaction.findFirstOrThrow({
          where: { source: 'RECURRING' },
        });
        await assert.rejects(
          client.transaction.create({
            data: { ...recurring, id: randomUUID() },
          }),
          (e: unknown) =>
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2002',
        );
      },
    );
    await t.test(
      'межпользовательские ссылки и удаление используемых сущностей запрещены',
      async () => {
        const foreign = await client.category.findFirstOrThrow({
          where: { userId: { not: original.userId } },
        });
        await assert.rejects(
          client.transaction.create({
            data: { ...clone, categoryId: foreign.id },
          }),
        );
        const rule = await client.recurringTransaction.findFirstOrThrow({
          where: { userId: foreign.userId },
        });
        await assert.rejects(
          client.transaction.create({
            data: {
              ...clone,
              recurringTransactionId: rule.id,
              recurringOccurrenceDate: original.transactionDate,
            },
          }),
        );
        await assert.rejects(
          client.category.delete({ where: { id: original.categoryId } }),
        );
        await assert.rejects(
          client.user.delete({ where: { id: original.userId } }),
        );
        const usedRule = await client.recurringTransaction.findFirstOrThrow();
        await assert.rejects(
          client.recurringTransaction.delete({ where: { id: usedRule.id } }),
        );
      },
    );
    await t.test(
      'email уникален без учёта регистра, одинаковые MANUAL операции допустимы',
      async () => {
        const user = await client.user.findFirstOrThrow();
        await assert.rejects(
          client.user.create({
            data: {
              ...user,
              id: randomUUID(),
              email: user.email.toUpperCase(),
            },
          }),
        );
        const row = await client.transaction.create({ data: clone });
        await client.transaction.delete({ where: { id: row.id } });
      },
    );
    await t.test(
      'CHECK защищают деньги, recurring-пару, календарь и audit snapshots',
      async () => {
        for (const fields of [
          { amount: 'NaN' },
          { amount: '0' },
          { amount: '-1' },
          { exchangeRate: '0' },
          { source: 'RECURRING' as const },
          { recurringOccurrenceDate: original.transactionDate },
        ]) {
          await assert.rejects(
            client.transaction.create({ data: { ...clone, ...fields } }),
          );
        }
        const budget = await client.budget.findFirstOrThrow();
        for (const fields of [
          { month: 0 },
          { month: 13 },
          { limitAmount: '0' },
        ])
          await assert.rejects(
            client.budget.create({
              data: { ...budget, id: randomUUID(), ...fields },
            }),
          );
        const rule = await client.recurringTransaction.findFirstOrThrow();
        for (const fields of [
          { dayOfMonth: 0 },
          { dayOfMonth: 32 },
          { amount: '0' },
          { exchangeRate: '0' },
          { endDate: new Date('2000-01-01') },
        ])
          await assert.rejects(
            client.recurringTransaction.create({
              data: { ...rule, id: randomUUID(), ...fields },
            }),
          );
        await assert.rejects(
          client.auditEntry.create({
            data: {
              id: randomUUID(),
              userId: original.userId,
              entityType: 'Transaction',
              entityId: original.id,
              action: 'CREATE',
              before: { amount: '1' },
            },
          }),
        );
        await assert.rejects(
          client.auditEntry.create({
            data: {
              id: randomUUID(),
              userId: original.userId,
              entityType: 'Transaction',
              entityId: original.id,
              action: 'CREATE',
              after: Prisma.JsonNull,
            },
          }),
        );
        await assert.rejects(
          client.$executeRawUnsafe(
            `UPDATE transactions SET source = 'INVALID' WHERE id = $1::uuid`,
            original.id,
          ),
        );
      },
    );
    await t.test(
      'runtime не изменяет audit и schema, rollback не оставляет финансовую запись',
      async () => {
        await assert.rejects(
          client.auditEntry.update({
            where: { id: completionId },
            data: { action: 'DELETE' },
          }),
        );
        await assert.rejects(
          client.auditEntry.delete({ where: { id: completionId } }),
        );
        await assert.rejects(client.$executeRaw`TRUNCATE audit_entries`);
        await assert.rejects(
          client.$executeRaw`CREATE TABLE forbidden (id integer)`,
        );
        const id = randomUUID();
        await assert.rejects(
          client.$transaction(async (db) => {
            await db.transaction.create({ data: { ...clone, id } });
            await db.auditEntry.create({
              data: {
                userId: original.userId,
                entityType: 'Transaction',
                entityId: id,
                action: 'CREATE',
              },
            });
          }),
        );
        assert.equal(
          await client.transaction.findUnique({ where: { id } }),
          null,
        );
      },
    );
    await t.test(
      'dataset содержит near/over budgets и содержательную месячную динамику',
      async () => {
        const usages = await client.$queryRaw<
          { category: string; ratio: string }[]
        >`SELECT c.name AS category, (sum(t."amountInBaseCurrency")/b."limitAmount")::text AS ratio FROM budgets b JOIN categories c ON c.id=b."categoryId" JOIN transactions t ON t."categoryId"=b."categoryId" AND extract(year from t."transactionDate")=b.year AND extract(month from t."transactionDate")=b.month GROUP BY b.id,c.name`;
        assert.ok(usages.some((r) => new Prisma.Decimal(r.ratio).gt('1')));
        assert.ok(
          usages.some(
            (r) =>
              new Prisma.Decimal(r.ratio).gte('0.94') &&
              new Prisma.Decimal(r.ratio).lte('0.96'),
          ),
        );
        const monthly = await client.$queryRaw<
          { month: number; income: string; expenses: string }[]
        >`SELECT extract(month from "transactionDate")::integer AS month, sum(CASE WHEN type='INCOME' THEN "amountInBaseCurrency" ELSE 0 END)::text AS income, sum(CASE WHEN type='EXPENSE' THEN "amountInBaseCurrency" ELSE 0 END)::text AS expenses FROM transactions GROUP BY month ORDER BY month`;
        assert.equal(monthly.length, 6);
        const savings = monthly.map((m) =>
          new Prisma.Decimal(m.income).minus(m.expenses).div(m.income),
        );
        assert.ok(savings.some((s) => s.gt('0.5')));
        assert.ok(savings.some((s) => s.lt('0.15')));
      },
    );
    await t.test(
      'повторный seed сохраняет пользовательские edits и не воскрешает удалённое',
      async () => {
        await client.transaction.update({
          where: { id: original.id },
          data: { description: 'Уточнение пользователя' },
        });
        const removed = await client.transaction.findFirstOrThrow({
          where: { id: { not: original.id }, source: 'MANUAL' },
        });
        await client.transaction.delete({ where: { id: removed.id } });
        const before = await digest(fixture.runtimeUrl);
        await seedDatabase(client, '2026-09-01');
        assert.equal(await digest(fixture.runtimeUrl), before);
      },
    );
  } finally {
    await fixture.close();
  }
});
