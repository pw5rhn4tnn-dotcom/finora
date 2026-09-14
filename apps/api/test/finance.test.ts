import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { z } from 'zod';
import { bootstrap } from '../src/bootstrap.js';
import { databaseFixture } from './database-fixture.js';
import { SessionService } from '../src/modules/auth/session.service.js';
import { AuditWriter } from '../src/modules/audit/audit.module.js';
import { TransactionsService } from '../src/modules/transactions/transactions.service.js';
import { CategoriesService } from '../src/modules/categories/categories.service.js';
import { UsersService } from '../src/modules/users/users.service.js';
import { financialSnapshot } from '../src/modules/finance/money.js';
import { seedDatabase } from '../prisma/seed-database.js';
import { seedId } from '../prisma/seed-data.js';
const object = z.record(z.string(), z.unknown());
const json = async (r: Response) => object.parse(await r.json());
const origin = 'http://finora.test';
const category = {
  name: 'Проверка',
  type: 'EXPENSE' as const,
  icon: 'wallet' as const,
  color: '#4F46E5',
};
await test('Деньги: точность, округление, валюты и пределы', () => {
  assert.equal(
    financialSnapshot('0.01', 'USD', 'RUB', '1.5').amountInBaseCurrency,
    '0.02',
  );
  assert.equal(
    financialSnapshot('9999999999999999.99', 'RUB', 'RUB').amountInBaseCurrency,
    '9999999999999999.99',
  );
  assert.equal(
    financialSnapshot('1', 'USD', 'JPY', '1.5').amountInBaseCurrency,
    '2',
  );
  assert.equal(
    financialSnapshot('0.01', 'USD', 'RUB', '0.01').amountInBaseCurrency,
    '0',
  );
  assert.throws(() => financialSnapshot('1.01', 'JPY', 'RUB', '1'));
  assert.throws(() =>
    financialSnapshot('9999999999999999.99', 'USD', 'RUB', '2'),
  );
  assert.throws(() => financialSnapshot('1', 'RUB', 'RUB', '2'));
});
await test('Stage 5: финансовый API на PostgreSQL', async (t) => {
  const fixture = await databaseFixture();
  const previous = { ...process.env };
  Object.assign(process.env, {
    DATABASE_URL: fixture.runtimeUrl,
    AUTH_SECRET: 'finora-stage5-secret-at-least-32-bytes',
    AUTH_ORIGINS: origin,
    AUTH_COOKIE_SECURE: 'false',
  });
  const app = await bootstrap(0);
  const base = `${await app.getUrl()}/api/v1`;
  const db = fixture.client;
  try {
    await seedDatabase(db, '2026-09-01');
    const userId = seedId('personal'),
      otherId = seedId('family');
    const sessions = app.get(SessionService);
    const token = await sessions.sign(userId);
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
    const ownCategory = seedId('personal:category:groceries'),
      foreignCategory = seedId('family:category:groceries'),
      foreignTransaction = seedId('family:transaction:0:4');
    const input = {
      amount: '12.34',
      currency: 'RUB',
      categoryId: ownCategory,
      type: 'EXPENSE' as const,
      transactionDate: '2026-02-28',
      description: 'Кириллица 100%_\\ покупка',
    };
    let createdId = '';
    await t.test(
      'Список, detail, сортировки, pagination и отсутствие чужих данных в total',
      async () => {
        const result = await json(await request('/transactions'));
        assert.equal(result.total, 120);
        assert.equal(result.page, 1);
        assert.equal(z.array(object).parse(result.items).length, 25);
        for (const sort of ['newest', 'oldest', 'amountDesc', 'amountAsc']) {
          const ids: string[] = [];
          const values: string[] = [];
          for (let page = 1; page <= 3; page++) {
            const r = await json(
              await request(
                `/transactions?pageSize=50&page=${page}&sort=${sort}`,
              ),
            );
            for (const row of z.array(object).parse(r.items)) {
              ids.push(z.string().parse(row.id));
              values.push(
                z
                  .string()
                  .parse(
                    sort.startsWith('amount')
                      ? row.amountInBaseCurrency
                      : row.transactionDate,
                  ),
              );
            }
          }
          assert.equal(new Set(ids).size, 120);
          assert.equal(ids.length, 120);
          const { Prisma } = await import('../src/generated/prisma/client.js');
          for (let i = 1; i < values.length; i++) {
            const compare = sort.startsWith('amount')
              ? new Prisma.Decimal(values[i - 1]!).cmp(values[i]!)
              : values[i - 1]!.localeCompare(values[i]!);
            assert.ok(
              sort === 'newest' || sort === 'amountDesc'
                ? compare >= 0
                : compare <= 0,
            );
          }
        }
        const last = await json(
          await request('/transactions?page=9999999&pageSize=10'),
        );
        assert.equal(last.total, 120);
        assert.deepEqual(last.items, []);
        assert.equal(
          (
            await json(
              await request(`/transactions?categoryId=${foreignCategory}`),
            )
          ).total,
          0,
        );
      },
    );
    await t.test(
      'CREATE/GET/PATCH/DELETE snapshots и курс при изменении суммы/валюты',
      async () => {
        const r = await request('/transactions', 'POST', input);
        assert.equal(r.status, 201);
        const row = await json(r);
        createdId = z.string().parse(row.id);
        assert.equal(row.amountInBaseCurrency, '12.34');
        assert.equal(row.exchangeRate, '1');
        assert.equal(row.transactionDate, '2026-02-28');
        assert.equal((await request(`/transactions/${createdId}`)).status, 200);
        assert.equal(
          (
            await request(`/transactions/${createdId}`, 'PATCH', {
              currency: 'USD',
            })
          ).status,
          400,
        );
        const updated = await json(
          await request(`/transactions/${createdId}`, 'PATCH', {
            currency: 'USD',
            exchangeRate: '91.375',
            amount: '12.99',
          }),
        );
        assert.equal(updated.amountInBaseCurrency, '1186.96');
        const changed = await json(
          await request(`/transactions/${createdId}`, 'PATCH', {
            amount: '20',
          }),
        );
        assert.equal(changed.exchangeRate, '91.375');
        assert.equal(changed.amountInBaseCurrency, '1827.5');
        const entries = await db.auditEntry.findMany({
          where: { entityId: createdId },
        });
        assert.equal(entries.length, 3);
        assert.equal(object.parse(entries[0]!.after).categoryName, 'Продукты');
      },
    );
    await t.test(
      'Комбинация фильтров, буквальный Unicode поиск по описанию и категории',
      async () => {
        const query = new URLSearchParams({
          search: '  КИРИЛЛИЦА 100%_\\  ',
          dateFrom: '2026-02-28',
          dateTo: '2026-02-28',
          amountMin: '1827.50',
          amountMax: '1827.50',
          type: 'EXPENSE',
          categoryId: ownCategory,
          currency: 'USD',
        });
        assert.equal(
          (await json(await request(`/transactions?${query.toString()}`)))
            .total,
          1,
        );
        assert.ok(
          Number(
            (
              await json(
                await request(
                  '/transactions?search=' + encodeURIComponent('продукты'),
                ),
              )
            ).total,
          ) > 1,
        );
        assert.equal(
          (
            await json(
              await request(
                '/transactions?search=' +
                  encodeURIComponent("'; DROP TABLE users;--"),
              ),
            )
          ).total,
          0,
        );
      },
    );
    await t.test(
      'IDOR: foreign/missing одинаковы; related IDs не раскрываются',
      async () => {
        for (const resource of ['transactions', 'categories'])
          for (const method of ['GET', 'PATCH', 'DELETE']) {
            const id =
              resource === 'transactions'
                ? foreignTransaction
                : foreignCategory;
            const payload =
              method === 'PATCH'
                ? resource === 'transactions'
                  ? { description: 'Атака' }
                  : { name: 'Атака' }
                : undefined;
            const foreign = await request(
                `/${resource}/${id}`,
                method,
                payload,
              ),
              missing = await request(
                `/${resource}/${randomUUID()}`,
                method,
                payload,
              );
            assert.equal(foreign.status, 404);
            assert.equal(missing.status, 404);
            const a = await json(foreign),
              b = await json(missing);
            delete a.traceId;
            delete b.traceId;
            assert.deepEqual(a, b);
          }
        for (const categoryId of [foreignCategory, randomUUID()]) {
          assert.equal(
            (await request('/transactions', 'POST', { ...input, categoryId }))
              .status,
            400,
          );
          assert.equal(
            (
              await request(`/transactions/${createdId}`, 'PATCH', {
                categoryId,
              })
            ).status,
            400,
          );
        }
        assert.equal(
          await db.transaction.count({ where: { userId: otherId } }),
          168,
        );
      },
    );
    await t.test(
      'Malformed IDs/body/query, mass assignment, денежные и календарные границы дают 4xx',
      async () => {
        for (const resource of ['transactions', 'categories']) {
          for (const method of ['GET', 'PATCH', 'DELETE'])
            assert.equal(
              (
                await request(
                  `/${resource}/bad-id`,
                  method,
                  method === 'PATCH' ? {} : undefined,
                )
              ).status,
              400,
            );
          for (const payload of [
            null,
            [],
            {},
            'text',
            { userId },
            { ownerId: userId },
          ])
            assert.equal(
              (await request(`/${resource}`, 'POST', payload)).status,
              400,
            );
        }
        for (const amount of [
          '0',
          '-1',
          'NaN',
          'Infinity',
          '1e2',
          '10000000000000000',
          '1.123456789',
          '1.001',
          {},
          [],
          null,
        ])
          assert.equal(
            (await request('/transactions', 'POST', { ...input, amount }))
              .status,
            400,
            JSON.stringify(amount),
          );
        for (const transactionDate of [
          '2026-02-29',
          '2024-02-30',
          '2026-13-01',
          '0000-01-01',
          '2026-09-01T00:00:00Z',
        ])
          assert.equal(
            (
              await request('/transactions', 'POST', {
                ...input,
                transactionDate,
              })
            ).status,
            400,
          );
        for (const patch of [
          { type: 'ALL' },
          { categoryId: null },
          { description: ' ' },
          { description: 'a'.repeat(501) },
          { exchangeRate: 'NaN' },
          { exchangeRate: '0' },
          { exchangeRate: '0.1234567890123' },
          ...[
            'userId',
            'ownerId',
            'createdAt',
            'updatedAt',
            'source',
            'amountInBaseCurrency',
            'recurringTransactionId',
          ].map((k) => ({ [k]: userId })),
        ])
          assert.equal(
            (await request(`/transactions/${createdId}`, 'PATCH', patch))
              .status,
            400,
            JSON.stringify(patch),
          );
        for (const query of [
          'page=0',
          'pageSize=100',
          'page=NaN',
          'page=1&page=2',
          'search[a]=b',
          'amountMin=NaN&amountMax=2',
          'dateFrom=2026-02-30',
          'dateFrom=2026-03-01&dateTo=2026-02-01',
          'amountMin=2&amountMax=1',
          'type=BAD',
          'sort=bad',
          'userId=' + otherId,
        ])
          assert.equal(
            (await request(`/transactions?${query.toString()}`)).status,
            400,
            query,
          );
        assert.equal(
          (
            await request('/transactions', 'POST', {
              ...input,
              categoryId: seedId('personal:category:salary'),
            })
          ).status,
          400,
        );
        assert.equal(
          (await request('/transactions', 'POST', input, '')).status,
          401,
        );
        assert.equal(
          (
            await request(
              '/categories',
              'GET',
              undefined,
              'finora_session=invalid',
            )
          ).status,
          401,
        );
      },
    );
    await t.test(
      'Категории: CRUD, case-insensitive concurrent duplicate, контролируемое удаление',
      async () => {
        const responses = await Promise.all([
          request('/categories', 'POST', category),
          request('/categories', 'POST', { ...category, name: ' ПРОВЕРКА ' }),
        ]);
        assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
        const successful = responses.find((r) => r.status === 201)!;
        const id = z.string().parse((await json(successful)).id);
        assert.equal(
          (
            await request(`/categories/${id}`, 'PATCH', {
              name: 'Изменено',
              type: 'INCOME',
            })
          ).status,
          200,
        );
        assert.equal(
          (await json(await request(`/categories/${id}`, 'DELETE'))).outcome,
          'deleted',
        );
        assert.equal((await request(`/categories/${id}`)).status, 404);
        assert.equal(
          (
            await request(`/categories/${ownCategory}`, 'PATCH', {
              type: 'INCOME',
            })
          ).status,
          409,
        );
      },
    );
    await t.test(
      'Имена категорий сравниваются буквально, включая LIKE metacharacters',
      async () => {
        for (const name of ['%', '_', '\\', 'Продукты_']) {
          const created = await request('/categories', 'POST', {
            ...category,
            name,
          });
          assert.equal(created.status, 201, name);
          const id = z.string().parse((await json(created)).id);
          assert.equal(
            (
              await request('/categories', 'POST', {
                ...category,
                name: name.toUpperCase(),
              })
            ).status,
            409,
          );
          assert.equal(
            (await request(`/categories/${id}`, 'DELETE')).status,
            200,
          );
        }
      },
    );
    await t.test(
      'Архивирование: правила и audit атомарны, старые операции редактируются, новые связи запрещены',
      async () => {
        const id = seedId('personal:category:subscriptions');
        assert.equal(
          (await json(await request(`/categories/${id}`, 'DELETE'))).outcome,
          'archived',
        );
        const rule = await db.recurringTransaction.findFirstOrThrow({
          where: { userId, categoryId: id },
        });
        assert.ok(rule.archivedAt);
        assert.equal(
          await db.auditEntry.count({
            where: { entityId: rule.id, action: 'ARCHIVE' },
          }),
          1,
        );
        assert.equal(
          (await request('/transactions', 'POST', { ...input, categoryId: id }))
            .status,
          400,
        );
        assert.equal(
          (
            await request(`/transactions/${createdId}`, 'PATCH', {
              categoryId: id,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              `/transactions/${seedId('personal:transaction:0:2')}`,
              'PATCH',
              { description: 'Историческая операция' },
            )
          ).status,
          200,
        );
        const count = await db.auditEntry.count();
        await request(`/categories/${id}`, 'DELETE');
        assert.equal(await db.auditEntry.count(), count);
      },
    );
    await t.test(
      'Audit failure откатывает create/update/delete/category и деактивацию rules',
      async () => {
        const audit = app.get(AuditWriter);
        const original = audit.write.bind(audit);
        const originalCreated = audit.categoryCreated.bind(audit);
        const count = await db.transaction.count();
        audit.write = () => Promise.reject(new Error('Проверка rollback'));
        audit.categoryCreated = () =>
          Promise.reject(new Error('Проверка rollback'));
        try {
          const service = app.get(TransactionsService),
            cats = app.get(CategoriesService);
          await assert.rejects(service.create(userId, input));
          assert.equal(await db.transaction.count(), count);
          await assert.rejects(
            service.update(userId, createdId, { description: 'Откат' }),
          );
          assert.notEqual(
            (
              await db.transaction.findFirstOrThrow({
                where: { id: createdId, userId },
              })
            ).description,
            'Откат',
          );
          await assert.rejects(service.remove(userId, createdId));
          assert.equal(await db.transaction.count(), count);
          await assert.rejects(
            cats.create(userId, { ...category, name: 'Откат' }),
          );
          assert.equal(
            await db.category.count({ where: { userId, name: 'Откат' } }),
            0,
          );
          const id = seedId('personal:category:home');
          await assert.rejects(cats.remove(userId, id));
          assert.equal(
            (await db.category.findFirstOrThrow({ where: { id, userId } }))
              .archivedAt,
            null,
          );
          assert.equal(
            (
              await db.recurringTransaction.findFirstOrThrow({
                where: { categoryId: id, userId },
              })
            ).archivedAt,
            null,
          );
        } finally {
          audit.write = original;
          audit.categoryCreated = originalCreated;
        }
      },
    );
    await t.test(
      'Конкурентные category archive/create и update/delete сохраняют инварианты',
      async () => {
        const cats = app.get(CategoriesService),
          service = app.get(TransactionsService);
        const c = await cats.create(userId, { ...category, name: 'Гонка' });
        const results = await Promise.allSettled([
          service.create(userId, { ...input, categoryId: c.id }),
          cats.remove(userId, c.id),
        ]);
        const rows = await db.transaction.findMany({
          where: { categoryId: c.id, userId },
        });
        if (rows.length) {
          assert.equal(rows.length, 1);
          assert.ok(
            (
              await db.category.findFirstOrThrow({
                where: { id: c.id, userId },
              })
            ).archivedAt,
          );
        } else assert.equal(results[0].status, 'rejected');
        await Promise.allSettled([
          service.update(userId, createdId, { description: 'Конкурентно' }),
          service.remove(userId, createdId),
        ]);
        assert.equal(
          await db.transaction.count({ where: { id: createdId } }),
          0,
        );
        assert.equal(
          await db.auditEntry.count({
            where: { entityId: createdId, action: 'DELETE' },
          }),
          1,
        );
      },
    );
    await t.test(
      'Первая операция конкурирует со сменой baseCurrency; audit блокирует смену после удаления',
      async () => {
        const owner = await db.user.create({
          data: {
            email: 'currency@finora.test',
            passwordHash: 'unused',
            displayName: 'Валюта',
            baseCurrency: 'RUB',
            timeZone: 'UTC',
            themePreference: 'light',
          },
        });
        const c = await app.get(CategoriesService).create(owner.id, category);
        const service = app.get(TransactionsService),
          users = app.get(UsersService);
        const results = await Promise.allSettled([
          service.create(owner.id, { ...input, categoryId: c.id }),
          users.update(owner.id, {
            displayName: owner.displayName,
            baseCurrency: 'USD',
            timeZone: 'UTC',
          }),
        ]);
        assert.ok(results.some((r) => r.status === 'fulfilled'));
        const rows = await db.transaction.findMany({
          where: { userId: owner.id },
        });
        if (rows.length) {
          assert.equal(
            (await db.user.findUniqueOrThrow({ where: { id: owner.id } }))
              .baseCurrency,
            'RUB',
          );
          await service.remove(owner.id, rows[0]!.id);
          await assert.rejects(
            users.update(owner.id, {
              displayName: owner.displayName,
              baseCurrency: 'USD',
              timeZone: 'UTC',
            }),
          );
        } else
          assert.equal(
            (await db.user.findUniqueOrThrow({ where: { id: owner.id } }))
              .baseCurrency,
            'USD',
          );
      },
    );
  } finally {
    await app.close();
    await fixture.close();
    process.env = previous;
  }
});
