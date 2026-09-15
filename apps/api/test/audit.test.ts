import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { bootstrap } from '../src/bootstrap.js';
import { databaseFixture } from './database-fixture.js';
import { SessionService } from '../src/modules/auth/session.service.js';
import { seedDatabase } from '../prisma/seed-database.js';
import { seedId } from '../prisma/seed-data.js';
const object = z.record(z.string(), z.unknown());
const json = async (r: Response) => object.parse(await r.json());
const origin = 'http://finora.test';

await test('Stage 10: read-only audit-log HTTP на настоящей PostgreSQL', async (t) => {
  const fixture = await databaseFixture();
  const previous = { ...process.env };
  Object.assign(process.env, {
    DATABASE_URL: fixture.runtimeUrl,
    AUTH_SECRET: 'finora-stage10-secret-at-least-32-bytes',
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
    const groceries = seedId('personal:category:groceries');
    const salaryCategory = seedId('personal:category:salary');
    const salaryRule = seedId('personal:rule:salary');
    const foreignTransaction = seedId('family:transaction:0:4');
    const sessions = app.get(SessionService);
    const ownToken = await sessions.sign(owner);
    const otherToken = await sessions.sign(other);
    const request = (
      path: string,
      method = 'GET',
      body?: unknown,
      cookie = `finora_session=${ownToken}`,
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
    await t.test(
      'Только собственные записи; чужой entityId дает total 0',
      async () => {
        const mine = await json(await request('/audit-log?pageSize=10'));
        assert.ok(z.number().parse(mine.total) > 0);
        assert.equal(z.array(object).parse(mine.items).length <= 10, true);
        const foreignAsOwner = await json(
          await request(`/audit-log?entityId=${foreignTransaction}`),
        );
        assert.equal(foreignAsOwner.total, 0);
        const foreignAsOther = await json(
          await request(
            `/audit-log?entityId=${foreignTransaction}`,
            'GET',
            undefined,
            `finora_session=${otherToken}`,
          ),
        );
        assert.equal(z.number().parse(foreignAsOther.total) >= 1, true);
      },
    );
    await t.test(
      'Фильтры entityType/action и стабильный порядок newest-first',
      async () => {
        const page1 = await json(
          await request(
            '/audit-log?entityType=Transaction&action=CREATE&pageSize=50',
          ),
        );
        const items1 = z.array(object).parse(page1.items);
        assert.ok(items1.length > 0);
        for (const row of items1) {
          assert.equal(row.entityType, 'Transaction');
          assert.equal(row.action, 'CREATE');
        }
        const timestamps = items1.map((r) => z.string().parse(r.createdAt));
        for (let i = 1; i < timestamps.length; i++)
          assert.ok(timestamps[i - 1]! >= timestamps[i]!);
      },
    );
    await t.test(
      'Некорректные query параметры дают 400 Problem Details',
      async () => {
        for (const query of [
          'entityType=Bogus',
          'action=Bogus',
          'dateFrom=2026-09-05&dateTo=2026-09-01',
          'unknownParam=1',
        ]) {
          const r = await request(`/audit-log?${query}`);
          assert.equal(r.status, 400);
          const body = await json(r);
          assert.equal(typeof body['title'], 'string');
        }
      },
    );
    await t.test('Read-only: у ресурса нет мутирующих методов', async () => {
      assert.equal((await request('/audit-log', 'POST', {})).status, 404);
      assert.equal(
        (await request('/audit-log/anything', 'PATCH', {})).status,
        404,
      );
      assert.equal(
        (await request('/audit-log/anything', 'DELETE')).status,
        404,
      );
    });
    let transactionId = '';
    await t.test(
      'Полнота: CREATE/UPDATE/DELETE Transaction видны через API с корректным before/after',
      async () => {
        const created = await json(
          await request('/transactions', 'POST', {
            amount: '500',
            currency: 'RUB',
            categoryId: groceries,
            type: 'EXPENSE',
            transactionDate: '2026-09-10',
            description: 'Аудит: создание',
          }),
        );
        transactionId = z.string().parse(created.id);
        await request(`/transactions/${transactionId}`, 'PATCH', {
          description: 'Аудит: изменение',
        });
        assert.equal(
          (await request(`/transactions/${transactionId}`, 'DELETE')).status,
          204,
        );
        const history = await json(
          await request(`/audit-log?entityId=${transactionId}&pageSize=10`),
        );
        const rows = z.array(object).parse(history.items);
        assert.equal(rows.length, 3);
        const [del, upd, cre] = rows;
        assert.equal(cre!['action'], 'CREATE');
        assert.equal(cre!['before'], null);
        assert.equal(
          object.parse(cre!['after'])['description'],
          'Аудит: создание',
        );
        assert.equal(upd!['action'], 'UPDATE');
        assert.equal(
          object.parse(upd!['before'])['description'],
          'Аудит: создание',
        );
        assert.equal(
          object.parse(upd!['after'])['description'],
          'Аудит: изменение',
        );
        assert.equal(del!['action'], 'DELETE');
        assert.equal(del!['after'], null);
        assert.equal(
          object.parse(del!['before'])['description'],
          'Аудит: изменение',
        );
      },
    );
    await t.test(
      'Полнота: CREATE/UPDATE/DELETE Budget видны через API',
      async () => {
        const created = await json(
          await request('/budgets', 'POST', {
            categoryId: groceries,
            year: 2026,
            month: 3,
            limitAmount: '1000',
          }),
        );
        const budgetId = z.string().parse(created.id);
        await request(`/budgets/${budgetId}`, 'PATCH', { limitAmount: '1500' });
        assert.equal(
          (await request(`/budgets/${budgetId}`, 'DELETE')).status,
          204,
        );
        const history = await json(
          await request(`/audit-log?entityId=${budgetId}&entityType=Budget`),
        );
        const rows = z.array(object).parse(history.items);
        assert.deepEqual(
          rows.map((r) => r['action']),
          ['DELETE', 'UPDATE', 'CREATE'],
        );
      },
    );
    await t.test(
      'Полнота: CREATE/UPDATE/DELETE (hard) RecurringTransaction видны через API',
      async () => {
        const created = await json(
          await request('/recurring-transactions', 'POST', {
            amount: '99',
            currency: 'RUB',
            categoryId: groceries,
            type: 'EXPENSE',
            description: 'Аудит: подписка',
            startDate: '2026-10-01',
          }),
        );
        const ruleId = z.string().parse(created.id);
        await request(`/recurring-transactions/${ruleId}`, 'PATCH', {
          dayOfMonth: 5,
        });
        const removal = await json(
          await request(`/recurring-transactions/${ruleId}`, 'DELETE'),
        );
        assert.equal(removal['outcome'], 'deleted');
        const history = await json(
          await request(
            `/audit-log?entityId=${ruleId}&entityType=RecurringTransaction`,
          ),
        );
        const rows = z.array(object).parse(history.items);
        assert.deepEqual(
          rows.map((r) => r['action']),
          ['DELETE', 'UPDATE', 'CREATE'],
        );
      },
    );
    await t.test(
      'Полнота: ARCHIVE виден и для Category, и каскадно для RecurringTransaction (использованная категория с активным правилом)',
      async () => {
        const removal = await json(
          await request(`/categories/${salaryCategory}`, 'DELETE'),
        );
        assert.equal(removal['outcome'], 'archived');
        const categoryHistory = await json(
          await request(`/audit-log?entityId=${salaryCategory}&pageSize=10`),
        );
        const categoryRows = z.array(object).parse(categoryHistory.items);
        assert.ok(categoryRows.some((r) => r['action'] === 'ARCHIVE'));
        const ruleHistory = await json(
          await request(
            `/audit-log?entityId=${salaryRule}&entityType=RecurringTransaction&pageSize=10`,
          ),
        );
        const ruleRows = z.array(object).parse(ruleHistory.items);
        assert.equal(ruleRows[0]!['action'], 'ARCHIVE');
      },
    );
    await t.test(
      'История переживает удаление операции и последующее переименование её категории (снимок не пересчитывается задним числом)',
      async () => {
        const created = await json(
          await request('/transactions', 'POST', {
            amount: '250',
            currency: 'RUB',
            categoryId: groceries,
            type: 'EXPENSE',
            transactionDate: '2026-09-11',
            description: 'Аудит: до переименования категории',
          }),
        );
        const id = z.string().parse(created.id);
        assert.equal(
          (await request(`/transactions/${id}`, 'DELETE')).status,
          204,
        );
        await request(`/categories/${groceries}`, 'PATCH', {
          name: 'Переименованные продукты',
        });
        const history = await json(
          await request(`/audit-log?entityId=${id}&pageSize=10`),
        );
        const rows = z.array(object).parse(history.items);
        const [del, cre] = rows;
        assert.equal(cre!['action'], 'CREATE');
        assert.equal(object.parse(cre!['after'])['categoryName'], 'Продукты');
        assert.equal(del!['action'], 'DELETE');
        assert.equal(object.parse(del!['before'])['categoryName'], 'Продукты');
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
