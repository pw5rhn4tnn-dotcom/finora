import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { z } from 'zod';
import pg from 'pg';
import { bootstrap } from '../src/bootstrap.js';
import { databaseFixture } from './database-fixture.js';
import { SessionService } from '../src/modules/auth/session.service.js';
import {
  BudgetsService,
  budgetUsage,
} from '../src/modules/budgets/budgets.service.js';
import { monthRange } from '../src/modules/budgets/budgets.validation.js';
import { TransactionsService } from '../src/modules/transactions/transactions.service.js';
import { CategoriesService } from '../src/modules/categories/categories.service.js';
import { AuditWriter } from '../src/modules/audit/audit.module.js';
import { UsersService } from '../src/modules/users/users.service.js';
import { seedDatabase } from '../prisma/seed-database.js';
import { seedId } from '../prisma/seed-data.js';
const object = z.record(z.string(), z.unknown());
const json = async (r: Response) => object.parse(await r.json());
const origin = 'http://finora.test';
await test('Budget Decimal: точность сумм, превышение, округление и большие агрегаты', () => {
  assert.deepEqual(budgetUsage('0.30', '0.3'), {
    spent: '0.3',
    remaining: '0',
    overBudget: false,
    progress: '100.00',
  });
  assert.deepEqual(budgetUsage('1', '0'), {
    spent: '0',
    remaining: '1',
    overBudget: false,
    progress: '0.00',
  });
  assert.equal(budgetUsage('3', '1').progress, '33.33');
  assert.equal(budgetUsage('8', '0.01').progress, '0.13');
  assert.equal(
    budgetUsage('9999999999999999.99', '9999999999999999.98').remaining,
    '0.01',
  );
  const big = budgetUsage('0.01', '999999999999999999999999.99');
  assert.equal(big.remaining, '-999999999999999999999999.98');
  assert.equal(big.progress, '9999999999999999999999999900.00');
});
await test('Месяц DATE: январь/декабрь, leap year, годы 1–99 и 9999, независимо от TZ', () => {
  const previous = process.env['TZ'];
  try {
    for (const tz of ['UTC', 'Pacific/Kiritimati', 'America/Los_Angeles']) {
      process.env['TZ'] = tz;
      for (const [year, month, first, next] of [
        [2024, 2, '2024-02-01', '2024-03-01'],
        [2026, 12, '2026-12-01', '2027-01-01'],
        [2027, 1, '2027-01-01', '2027-02-01'],
        [1, 1, '0001-01-01', '0001-02-01'],
        [99, 12, '0099-12-01', '0100-01-01'],
        [9999, 12, '9999-12-01', '+010000-01-01'],
      ] as const) {
        const r = monthRange(year, month);
        assert.ok(r.gte.toISOString().startsWith(first));
        assert.ok(r.lt.toISOString().startsWith(next));
      }
    }
  } finally {
    if (previous === undefined) delete process.env['TZ'];
    else process.env['TZ'] = previous;
  }
});
await test('Stage 6: budgets HTTP и настоящая PostgreSQL', async (t) => {
  const fixture = await databaseFixture();
  const previous = { ...process.env };
  Object.assign(process.env, {
    DATABASE_URL: fixture.runtimeUrl,
    AUTH_SECRET: 'finora-stage6-secret-at-least-32-bytes',
    AUTH_ORIGINS: origin,
    AUTH_COOKIE_SECURE: 'false',
  });
  const app = await bootstrap(0);
  const db = fixture.client;
  const base = `${await app.getUrl()}/api/v1`;
  try {
    await seedDatabase(db, '2026-09-01');
    const owner = seedId('personal'),
      other = seedId('family');
    const ownCategory = seedId('personal:category:groceries');
    const foreignCategory = seedId('family:category:groceries');
    const foreignBudget = seedId('family:budget:5:groceries');
    const token = await app.get(SessionService).sign(owner);
    const request = (
      path: string,
      method = 'GET',
      body?: unknown,
      cookie = `finora_session=${token}`,
    ) =>
      fetch(`${base}${path}`, {
        method,
        headers: {
          Origin: origin,
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    const service = app.get(BudgetsService),
      transactions = app.get(TransactionsService),
      categories = app.get(CategoriesService);
    const input = {
      categoryId: ownCategory,
      year: 2024,
      month: 2,
      limitAmount: '0.30',
    };
    const create = async (values = input) => {
      const r = await request('/budgets', 'POST', values);
      assert.equal(r.status, 201, await r.clone().text());
      return json(r);
    };
    await t.test(
      'CRUD и audit CREATE/UPDATE/DELETE с историческим именем и decimal strings',
      async () => {
        const row = await create();
        const id = z.string().parse(row.id);
        assert.equal(row.spent, '0');
        assert.equal(row.remaining, '0.3');
        assert.equal(row.currency, 'RUB');
        assert.equal((await request(`/budgets/${id}`)).status, 200);
        const changed = await json(
          await request(`/budgets/${id}`, 'PATCH', { limitAmount: '1.25' }),
        );
        assert.equal(changed.limitAmount, '1.25');
        assert.equal((await request(`/budgets/${id}`, 'DELETE')).status, 204);
        assert.equal((await request(`/budgets/${id}`)).status, 404);
        const audit = await db.auditEntry.findMany({
          where: { userId: owner, entityId: id },
          orderBy: { createdAt: 'asc' },
        });
        assert.deepEqual(
          audit.map((e) => e.action),
          ['CREATE', 'UPDATE', 'DELETE'],
        );
        assert.equal(audit[0]!.before, null);
        assert.equal(audit[2]!.after, null);
        assert.equal(object.parse(audit[0]!.after).categoryName, 'Продукты');
        assert.equal(object.parse(audit[0]!.after).limitAmount, '0.3');
        assert.equal(object.parse(audit[1]!.before).limitAmount, '0.3');
        assert.equal(object.parse(audit[2]!.before).limitAmount, '1.25');
        assert.ok(!JSON.stringify(audit).includes('password'));
      },
    );
    await t.test(
      'Seed: near/over-budget и изолированный monthly total, включая пустую страницу',
      async () => {
        const result = await json(await request('/budgets?year=2026&month=9'));
        assert.equal(result.total, 3);
        const rows = z.array(object).parse(result.items);
        assert.equal(rows.filter((b) => b.overBudget).length, 1);
        assert.ok(
          rows.some((b) => Number(b.progress) > 94 && Number(b.progress) < 96),
        );
        const empty = await json(
          await request('/budgets?year=2026&month=9&page=9999999&pageSize=10'),
        );
        assert.equal(empty.total, 3);
        assert.deepEqual(empty.items, []);
        assert.equal(
          (await json(await request('/budgets?year=2023&month=1'))).total,
          0,
        );
      },
    );
    await t.test(
      'Auth, foreign GET/PATCH/DELETE, category injection и mass assignment',
      async () => {
        const own = await create();
        const id = z.string().parse(own.id);
        for (const method of ['GET', 'PATCH', 'DELETE']) {
          assert.equal(
            (
              await request(
                `/budgets/${foreignBudget}`,
                method,
                method === 'PATCH' ? { limitAmount: '5' } : undefined,
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await request(
                `/budgets/${randomUUID()}`,
                method,
                method === 'PATCH' ? { limitAmount: '5' } : undefined,
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await request(
                `/budgets/not-uuid`,
                method,
                method === 'PATCH' ? { limitAmount: '5' } : undefined,
              )
            ).status,
            400,
          );
        }
        assert.equal(
          (await request('/budgets?year=2026&month=9', 'GET', undefined, ''))
            .status,
          401,
        );
        for (const method of ['POST', 'PATCH']) {
          const path = method === 'POST' ? '/budgets' : `/budgets/${id}`;
          assert.equal(
            (
              await request(path, method, {
                ...input,
                categoryId: foreignCategory,
              })
            ).status,
            400,
          );
          for (const field of [
            'userId',
            'ownerId',
            'spent',
            'remaining',
            'currency',
            'createdAt',
            'updatedAt',
            'overBudget',
            'progress',
            'id',
          ])
            assert.equal(
              (await request(path, method, { ...input, [field]: other }))
                .status,
              400,
              field,
            );
        }
        await request(`/budgets/${id}`, 'DELETE');
      },
    );
    await t.test(
      'Строгие payload/query: amount, month/year, UUID, null, arrays, неизвестные поля',
      async () => {
        for (const limitAmount of [
          '0',
          '-1',
          'NaN',
          'Infinity',
          '1e3',
          '01',
          '1,2',
          '0.001',
          '10000000000000000',
          '1.000000001',
          10,
          null,
        ])
          assert.equal(
            (await request('/budgets', 'POST', { ...input, limitAmount }))
              .status,
            400,
            String(limitAmount),
          );
        for (const change of [
          { month: 0 },
          { month: 13 },
          { month: 1.5 },
          { month: '2' },
          { year: 0 },
          { year: 10000 },
          { year: '2024' },
          { year: null },
          { categoryId: 'bad' },
          { categoryId: seedId('personal:category:salary') },
        ])
          assert.equal(
            (await request('/budgets', 'POST', { ...input, ...change })).status,
            400,
          );
        for (const body of [null, [], {}, 'text'])
          assert.equal((await request('/budgets', 'POST', body)).status, 400);
        for (const query of [
          '',
          'year=2026',
          'month=9',
          'year=0000&month=1',
          'year=2026&month=01',
          'year=2026&month=13',
          'year=2026&month=9&month=10',
          'year=2026&month[x]=9',
          'year=2026&month=9&page=0',
          'year=2026&month=9&pageSize=100',
          'year=2026&month=9&userId=' + other,
        ])
          assert.equal((await request(`/budgets?${query}`)).status, 400, query);
        const r = await request(`/budgets/${foreignBudget}`, 'PATCH', {});
        assert.equal(r.status, 400);
        const error = await json(r);
        assert.ok(error.traceId);
        assert.equal(error.type, 'validation_error');
        assert.ok(!JSON.stringify(error).includes('Prisma'));
      },
    );
    await t.test(
      'Concurrent create и update: UNIQUE даёт 409, бизнес-ошибка не создаёт audit',
      async () => {
        const count = await db.auditEntry.count();
        const results = await Promise.all([
          request('/budgets', 'POST', input),
          request('/budgets', 'POST', input),
        ]);
        assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
        assert.equal(await db.auditEntry.count(), count + 1);
        const id = z
          .string()
          .parse((await json(results.find((r) => r.status === 201)!)).id);
        const a = await service.create(owner, { ...input, month: 3 });
        const b = await service.create(owner, { ...input, month: 4 });
        const updates = await Promise.all([
          request(`/budgets/${a.id}`, 'PATCH', { month: 5 }),
          request(`/budgets/${b.id}`, 'PATCH', { month: 5 }),
        ]);
        assert.deepEqual(updates.map((r) => r.status).sort(), [200, 409]);
        for (const value of [id, a.id, b.id])
          await service.remove(owner, value);
      },
    );
    await t.test(
      'DB constraints: direct concurrent duplicate, composite owner FK, positive/non-NaN limit, month range',
      async () => {
        const values = { ...input, userId: owner };
        const r = await Promise.allSettled([
          db.budget.create({ data: values }),
          db.budget.create({ data: values }),
        ]);
        assert.equal(r.filter((v) => v.status === 'fulfilled').length, 1);
        for (const data of [
          { ...values, categoryId: foreignCategory },
          { ...values, month: 0 },
          { ...values, month: 13 },
          { ...values, month: 6, limitAmount: '0' },
          { ...values, month: 6, limitAmount: '-1' },
          { ...values, month: 6, limitAmount: 'NaN' },
        ])
          await assert.rejects(db.budget.create({ data }));
        await db.budget.deleteMany({ where: { userId: owner, year: 2024 } });
      },
    );
    await t.test(
      'Фактические расходы: leap-day, границы DATE, чужие записи, FX, >50 операций, update/delete',
      async () => {
        const budget = await service.create(owner, input);
        const transaction = {
          categoryId: ownCategory,
          type: 'EXPENSE' as const,
          amount: '0.1',
          currency: 'RUB',
          transactionDate: '2024-02-01',
          description: 'Граница бюджета',
        };
        await transactions.create(owner, {
          ...transaction,
          amount: '100',
          transactionDate: '2024-01-31',
        });
        await transactions.create(owner, {
          ...transaction,
          amount: '100',
          transactionDate: '2024-03-01',
        });
        await transactions.create(other, {
          ...transaction,
          categoryId: foreignCategory,
          amount: '999',
        });
        const first = await transactions.create(owner, transaction);
        const last = await transactions.create(owner, {
          ...transaction,
          amount: '0.2',
          transactionDate: '2024-02-29',
        });
        assert.equal((await service.get(owner, budget.id)).spent, '0.3');
        assert.equal((await service.get(owner, budget.id)).progress, '100.00');
        await transactions.update(owner, last.id, {
          transactionDate: '2024-03-01',
        });
        assert.equal((await service.get(owner, budget.id)).spent, '0.1');
        await transactions.remove(owner, first.id);
        assert.equal((await service.get(owner, budget.id)).spent, '0');
        await transactions.create(owner, {
          ...transaction,
          amount: '0.01',
          currency: 'USD',
          exchangeRate: '1.5',
        });
        for (let i = 0; i < 55; i++)
          await transactions.create(owner, { ...transaction, amount: '0.01' });
        const actual = await service.get(owner, budget.id);
        assert.equal(actual.spent, '0.57');
        assert.equal(actual.remaining, '-0.27');
        assert.equal(actual.overBudget, true);
        assert.equal(actual.progress, '190.00');
        await transactions.list(owner, {
          page: 1,
          pageSize: 10,
          search: 'Несуществующий поиск',
          type: 'ALL',
          sort: 'newest',
        });
        assert.equal(
          (
            await service.list(owner, {
              year: 2024,
              month: 2,
              page: 1,
              pageSize: 10,
            })
          ).items[0]!.spent,
          '0.57',
        );
        await service.remove(owner, budget.id);
      },
    );
    await t.test(
      'DB session timezone и профиль не сдвигают historical DATE / переход года',
      async () => {
        const budget = await service.create(owner, {
          ...input,
          year: 2027,
          month: 1,
        });
        const raw = new pg.Client({ connectionString: fixture.runtimeUrl });
        await raw.connect();
        try {
          await raw.query("SET TIME ZONE 'Pacific/Kiritimati'");
          await raw.query(
            `INSERT INTO transactions (id, "userId", "categoryId", type, amount, currency, "exchangeRate", "amountInBaseCurrency", description, "transactionDate", source, "updatedAt") VALUES ($1,$2,$3,'EXPENSE',0.2,'RUB',1,0.2,'Календарная дата','2027-01-01','MANUAL',now())`,
            [randomUUID(), owner, ownCategory],
          );
          for (const timeZone of [
            'America/Los_Angeles',
            'Pacific/Kiritimati',
          ]) {
            await db.user.update({ where: { id: owner }, data: { timeZone } });
            assert.equal((await service.get(owner, budget.id)).spent, '0.2');
          }
        } finally {
          await raw.end();
        }
        await service.remove(owner, budget.id);
      },
    );
    await t.test(
      'Архив категории сохраняет историю; новые связи и перенос в другой месяц запрещены',
      async () => {
        const cat = await categories.create(owner, {
          name: 'Исторический бюджет',
          type: 'EXPENSE',
          icon: 'wallet',
          color: '#4338A3',
        });
        const b = await service.create(owner, { ...input, categoryId: cat.id });
        assert.equal(
          (await categories.remove(owner, cat.id)).outcome,
          'archived',
        );
        assert.ok((await service.get(owner, b.id)).category.archivedAt);
        assert.equal(
          (await service.update(owner, b.id, { limitAmount: '2' })).limitAmount,
          '2',
        );
        await assert.rejects(
          service.create(owner, { ...input, categoryId: cat.id, month: 8 }),
        );
        await assert.rejects(service.update(owner, b.id, { month: 8 }));
        await assert.rejects(
          categories.update(owner, cat.id, { type: 'INCOME' }),
        );
        await service.remove(owner, b.id);
      },
    );
    await t.test(
      'Audit failure после INSERT откатывает create/update/delete вместе с уже записанным audit',
      async () => {
        const b = await service.create(owner, { ...input, month: 8 });
        const audit = app.get(AuditWriter);
        const original = audit.write.bind(audit);
        const count = await db.auditEntry.count();
        audit.write = async (...args) => {
          await original(...args);
          throw new Error('Принудительный откат после audit INSERT');
        };
        try {
          await assert.rejects(service.create(owner, { ...input, month: 9 }));
          await assert.rejects(
            service.update(owner, b.id, { limitAmount: '500' }),
          );
          await assert.rejects(service.remove(owner, b.id));
          assert.equal(
            await db.budget.count({
              where: { userId: owner, year: 2024, month: 9 },
            }),
            0,
          );
          assert.equal((await service.get(owner, b.id)).limitAmount, '0.3');
          assert.equal(await db.auditEntry.count(), count);
        } finally {
          audit.write = original;
        }
        await service.remove(owner, b.id);
      },
    );
    await t.test(
      'Смена категории/суммы операции и категории/периода бюджета пересчитывает использование',
      async () => {
        const a = await categories.create(owner, {
          name: 'Перенос A',
          type: 'EXPENSE',
          icon: 'wallet',
          color: '#4338A3',
        });
        const b = await categories.create(owner, {
          name: 'Перенос B',
          type: 'EXPENSE',
          icon: 'wallet',
          color: '#4338A3',
        });
        const budget = await service.create(owner, {
          ...input,
          categoryId: a.id,
        });
        const tx = await transactions.create(owner, {
          categoryId: a.id,
          amount: '0.1',
          currency: 'RUB',
          type: 'EXPENSE',
          description: 'Изменяемый расход',
          transactionDate: '2024-02-29',
        });
        assert.equal((await service.get(owner, budget.id)).spent, '0.1');
        await transactions.update(owner, tx.id, {
          categoryId: b.id,
          amount: '0.2',
        });
        assert.equal((await service.get(owner, budget.id)).spent, '0');
        assert.equal(
          (await service.update(owner, budget.id, { categoryId: b.id })).spent,
          '0.2',
        );
        assert.equal(
          (await service.update(owner, budget.id, { month: 3 })).spent,
          '0',
        );
        await transactions.remove(owner, tx.id);
        await service.remove(owner, budget.id);
      },
    );
    await t.test(
      'Archive/create race бюджета сохраняет историческую связь и запрещает новую',
      async () => {
        const c = await categories.create(owner, {
          name: 'Гонка бюджета с архивом',
          type: 'EXPENSE',
          icon: 'wallet',
          color: '#4338A3',
        });
        await transactions.create(owner, {
          categoryId: c.id,
          amount: '1',
          currency: 'RUB',
          type: 'EXPENSE',
          description: 'Используемая категория',
          transactionDate: '2024-02-01',
        });
        const results = await Promise.allSettled([
          service.create(owner, { ...input, categoryId: c.id }),
          categories.remove(owner, c.id),
        ]);
        assert.equal(results[1].status, 'fulfilled');
        assert.ok((await categories.get(owner, c.id)).archivedAt);
        if (results[0].status === 'fulfilled')
          assert.ok(
            (await service.get(owner, results[0].value.id)).category.archivedAt,
          );
        else
          assert.equal(
            await db.budget.count({
              where: { userId: owner, categoryId: c.id },
            }),
            0,
          );
        await assert.rejects(
          service.create(owner, { ...input, categoryId: c.id, month: 6 }),
        );
      },
    );
    await t.test(
      '35 бюджетов и 10000 операций: стабильные страницы, GROUP BY и EXPLAIN ANALYZE',
      async (check) => {
        const ids: string[] = [];
        for (let i = 0; i < 35; i++) {
          const c = await categories.create(owner, {
            name: `Масштаб ${String(i).padStart(2, '0')}`,
            type: 'EXPENSE',
            icon: 'wallet',
            color: '#4338A3',
          });
          ids.push(c.id);
          await service.create(owner, {
            categoryId: c.id,
            year: 2025,
            month: 10,
            limitAmount: '100',
          });
        }
        const categoryId = ids[0]!;
        await db.$executeRaw`INSERT INTO transactions (id, "userId", "categoryId", type, amount, currency, "exchangeRate", "amountInBaseCurrency", description, "transactionDate", source, "updatedAt")
        SELECT md5('finora-stage6-volume-' || i::text)::uuid, ${owner}::uuid, ${categoryId}::uuid, 'EXPENSE', 0.01, 'RUB', 1, 0.01, 'Проверка агрегации',
          CASE WHEN i <= 5000 THEN DATE '2025-10-01' ELSE DATE '2025-11-01' END, 'MANUAL', now() FROM generate_series(1,10000) i`;
        const pages = [];
        for (let page = 1; page <= 4; page++)
          pages.push(
            await service.list(owner, {
              year: 2025,
              month: 10,
              page,
              pageSize: 10,
            }),
          );
        assert.ok(pages.every((p) => p.total === 35));
        assert.equal(
          new Set(pages.flatMap((p) => p.items.map((r) => r.id))).size,
          35,
        );
        assert.equal(pages[0]!.items[0]!.spent, '50');
        assert.equal(pages[0]!.items[0]!.remaining, '50');
        const plan = await db.$queryRaw<
          { 'QUERY PLAN': string }[]
        >`EXPLAIN (ANALYZE, BUFFERS) SELECT "categoryId", SUM("amountInBaseCurrency") FROM transactions
        WHERE "userId" = ${owner}::uuid AND type = 'EXPENSE' AND "categoryId" IN (${categoryId}::uuid)
        AND "transactionDate" >= DATE '2025-10-01' AND "transactionDate" < DATE '2025-11-01' GROUP BY "categoryId"`;
        const output = plan.map((r) => r['QUERY PLAN']).join('\n');
        assert.match(output, /Aggregate/);
        assert.match(output, /actual time=/);
        check.diagnostic(output);
      },
    );
    await t.test(
      'Ошибка уникальности audit не маскируется под дубликат бюджета и откатывает запись',
      async () => {
        const existing = await db.auditEntry.findFirstOrThrow({
          where: { userId: owner },
        });
        const audit = app.get(AuditWriter),
          original = audit.write.bind(audit);
        const before = await db.budget.count();
        audit.write = async (tx) => {
          await tx.auditEntry.create({
            data: {
              id: existing.id,
              userId: owner,
              entityType: 'Budget',
              entityId: randomUUID(),
              action: 'CREATE',
              after: { test: true },
            },
          });
        };
        try {
          const r = await request('/budgets', 'POST', { ...input, month: 7 });
          assert.equal(r.status, 500);
          const body = await json(r);
          assert.equal(body.type, 'internal_error');
          assert.ok(!JSON.stringify(body).includes('Prisma'));
          assert.equal(await db.budget.count(), before);
        } finally {
          audit.write = original;
        }
      },
    );
    await t.test(
      'Concurrent update/delete сериализуются и возвращают контролируемые статусы',
      async () => {
        const b = await service.create(owner, { ...input, month: 10 });
        const r = await Promise.all([
          request(`/budgets/${b.id}`, 'PATCH', { limitAmount: '2' }),
          request(`/budgets/${b.id}`, 'DELETE'),
          request(`/budgets/${b.id}`, 'DELETE'),
        ]);
        assert.ok([200, 404].includes(r[0].status));
        assert.deepEqual(
          r
            .slice(1)
            .map((v) => v.status)
            .sort(),
          [204, 404],
        );
        assert.equal(await db.budget.count({ where: { id: b.id } }), 0);
        assert.equal(
          await db.auditEntry.count({
            where: { entityId: b.id, action: 'DELETE' },
          }),
          1,
        );
      },
    );
    await t.test(
      'Первый budget против baseCurrency update; audit сохраняет lock после удаления',
      async () => {
        const user = await db.user.create({
          data: {
            email: 'budget-race@finora.test',
            passwordHash: 'fixture',
            displayName: 'Тест',
            baseCurrency: 'RUB',
            timeZone: 'UTC',
            themePreference: 'light',
          },
        });
        const cat = await categories.create(user.id, {
          name: 'Бюджет',
          type: 'EXPENSE',
          icon: 'wallet',
          color: '#4338A3',
        });
        const results = await Promise.allSettled([
          service.create(user.id, { ...input, categoryId: cat.id }),
          app.get(UsersService).update(user.id, {
            displayName: 'Тест',
            baseCurrency: 'USD',
            timeZone: 'UTC',
          }),
        ]);
        assert.equal(results[0].status, 'fulfilled');
        const row = await service.list(user.id, {
          year: 2024,
          month: 2,
          page: 1,
          pageSize: 25,
        });
        const current = await db.user.findUniqueOrThrow({
          where: { id: user.id },
        });
        assert.equal(row.items[0]!.currency, current.baseCurrency);
        await service.remove(user.id, row.items[0]!.id);
        await assert.rejects(
          app.get(UsersService).update(user.id, {
            displayName: 'Тест',
            baseCurrency: current.baseCurrency === 'RUB' ? 'USD' : 'RUB',
            timeZone: 'UTC',
          }),
        );
      },
    );
  } finally {
    await app.close();
    await fixture.close();
    for (const key of Object.keys(process.env))
      if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});
