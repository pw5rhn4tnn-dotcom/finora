import { z } from 'zod';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import pg from 'pg';
import { SignJWT } from 'jose';
import { bootstrap } from '../src/bootstrap.js';
import { databaseFixture } from './database-fixture.js';
import { seedDatabase } from '../prisma/seed-database.js';
import { demoProfiles, seedId } from '../prisma/seed-data.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import {
  SessionService,
  audience,
  issuer,
} from '../src/modules/auth/session.service.js';
import { AuditWriter } from '../src/modules/audit/audit.module.js';
import { hashPassword, verifyPassword } from '../src/modules/auth/password.js';
import { UsersService } from '../src/modules/users/users.service.js';

const json = async (response: Response) =>
  z.record(z.string(), z.unknown()).parse(await response.json());
const secret = 'finora-test-secret-at-least-32-bytes';
const origin = 'http://finora.test';
const account = (email: string) => ({
  email,
  password: 'Strong-password-2026!',
  displayName: 'Новый профиль',
  baseCurrency: 'RUB',
  timeZone: 'Europe/Moscow',
});
await test('Stage 4: auth, изоляция и атомарность на PostgreSQL', async (t) => {
  const fixture = await databaseFixture();
  const previous = { ...process.env };
  Object.assign(process.env, {
    DATABASE_URL: fixture.runtimeUrl,
    AUTH_SECRET: secret,
    AUTH_ORIGINS: origin,
    AUTH_COOKIE_SECURE: 'false',
    AUTH_TRUST_PROXY: 'true',
  });
  const app = await bootstrap(0);
  const base = `${await app.getUrl()}/api/v1`;
  let ip = 1;
  const request = (
    path: string,
    method = 'GET',
    body?: unknown,
    cookie?: string,
    headers: Record<string, string> = {},
  ) =>
    fetch(`${base}${path}`, {
      method,
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        'X-Forwarded-For': `192.0.2.${ip++}`,
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const auth = app.get(AuthService);
  const users = app.get(UsersService);
  const sessions = app.get(SessionService);
  let firstId = '';
  let firstCookie = '';
  try {
    await seedDatabase(fixture.client, '2026-09-01');
    await t.test(
      'register нормализует email, создаёт 8 категорий + audit, me не раскрывает hash',
      async () => {
        const response = await request(
          '/auth/register',
          'POST',
          account('  New@Example.COM  '),
        );
        assert.equal(response.status, 201);
        const body = await json(response);
        assert.equal(typeof body.id, 'string');
        assert.ok(typeof body.id === 'string');
        firstId = body.id;
        firstCookie = response.headers.get('set-cookie')!.split(';')[0]!;
        assert.equal(body.email, 'new@example.com');
        assert.equal(body.baseCurrencyLocked, false);
        assert.equal(body.passwordHash, undefined);
        assert.equal(body.password, undefined);
        assert.match(
          response.headers.get('set-cookie')!,
          /Path=\/; HttpOnly; SameSite=Strict; Max-Age=86400/,
        );
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal(
          await fixture.client.category.count({ where: { userId: firstId } }),
          8,
        );
        const entries = await fixture.client.auditEntry.findMany({
          where: { userId: firstId },
        });
        assert.equal(entries.length, 8);
        for (const entry of entries) {
          assert.equal(entry.before, null);
          assert.equal(entry.entityType, 'Category');
          assert.equal(entry.action, 'CREATE');
          assert.ok(!JSON.stringify(entry.after).includes('password'));
        }
        const me = await request('/auth/me', 'GET', undefined, firstCookie);
        assert.equal(me.status, 200);
        assert.deepEqual(await json(me), body);
        const stored = await fixture.client.user.findUniqueOrThrow({
          where: { id: firstId },
        });
        assert.ok(
          await verifyPassword(account('').password, stored.passwordHash),
        );
      },
    );
    await t.test(
      'Argon2id использует случайную соль и проверяет неверный пароль',
      async () => {
        const one = await hashPassword('password');
        const two = await hashPassword('password');
        assert.notEqual(one, two);
        assert.equal(await verifyPassword('wrong', one), false);
      },
    );
    await t.test(
      'конкурентный email case-insensitive: ровно один commit и один 409',
      async () => {
        const replies = await Promise.all([
          request('/auth/register', 'POST', account('race@example.com')),
          request('/auth/register', 'POST', account('RACE@example.com')),
        ]);
        assert.deepEqual(replies.map((r) => r.status).sort(), [201, 409]);
        const user = await fixture.client.user.findFirstOrThrow({
          where: { email: 'race@example.com' },
        });
        assert.equal(
          await fixture.client.category.count({ where: { userId: user.id } }),
          8,
        );
        assert.equal(
          await fixture.client.auditEntry.count({ where: { userId: user.id } }),
          8,
        );
      },
    );
    await t.test(
      'ошибка audit откатывает регистрацию, категории и ранее записанный audit',
      async () => {
        const writer = app.get(AuditWriter);
        const original = writer.categoryCreated.bind(writer);
        let count = 0;
        const mocked = t.mock.method(
          writer,
          'categoryCreated',
          async (...args: Parameters<AuditWriter['categoryCreated']>) => {
            await original(...args);
            if (++count === 3) throw new Error('forced audit rollback');
          },
        );
        try {
          const response = await request(
            '/auth/register',
            'POST',
            account('rollback@example.com'),
          );
          assert.equal(response.status, 500);
          assert.ok(!JSON.stringify(await json(response)).includes('forced'));
          assert.equal(
            await fixture.client.user.count({
              where: { email: 'rollback@example.com' },
            }),
            0,
          );
          assert.equal(await fixture.client.auditEntry.count(), 380);
        } finally {
          mocked.mock.restore();
        }
      },
    );
    await t.test(
      'оба seed аккаунта входят реальным Argon2id, неверный/неизвестный login одинаковы',
      async () => {
        for (const demo of demoProfiles) {
          const response = await request('/auth/login', 'POST', {
            email: demo.email.toUpperCase(),
            password: demo.password,
          });
          assert.equal(response.status, 200);
          assert.equal((await json(response)).id, seedId(demo.key));
        }
        const messages = [];
        for (const email of ['personal@finora.example', 'absent@example.com']) {
          const response = await request('/auth/login', 'POST', {
            email,
            password: 'wrong',
          });
          assert.equal(response.status, 401);
          const problem = await json(response);
          messages.push(problem.detail);
          assert.equal(problem.type, 'authentication_error');
        }
        assert.equal(messages[0], messages[1]);
      },
    );
    await t.test(
      'отсутствующий, malformed, expired JWT и неверные claims отклоняются',
      async () => {
        assert.equal((await request('/auth/me')).status, 401);
        for (const token of [
          'bad',
          await new SignJWT({})
            .setProtectedHeader({ alg: 'HS256' })
            .setSubject(firstId)
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(new TextEncoder().encode(secret)),
        ])
          assert.equal(
            (
              await request(
                '/auth/me',
                'GET',
                undefined,
                `finora_session=${token}`,
              )
            ).status,
            401,
          );
        for (const variant of [
          'expired',
          'audience',
          'issuer',
          'algorithm',
          'missing-user',
          'invalid-id',
          'signature',
        ]) {
          const token = await new SignJWT({})
            .setProtectedHeader({
              alg: variant === 'algorithm' ? 'HS384' : 'HS256',
            })
            .setSubject(
              variant === 'missing-user'
                ? randomUUID()
                : variant === 'invalid-id'
                  ? 'invalid'
                  : firstId,
            )
            .setIssuedAt()
            .setExpirationTime(variant === 'expired' ? '0s' : '1h')
            .setIssuer(variant === 'issuer' ? 'other' : issuer)
            .setAudience(variant === 'audience' ? 'other' : audience)
            .sign(
              new TextEncoder().encode(
                variant === 'signature' ? secret + 'other' : secret,
              ),
            );
          assert.equal(
            (
              await request(
                '/auth/me',
                'GET',
                undefined,
                `finora_session=${token}`,
              )
            ).status,
            401,
            variant,
          );
        }
        assert.equal(
          (
            await request(
              '/auth/me',
              'GET',
              undefined,
              `${firstCookie}; ${firstCookie}`,
            )
          ).status,
          401,
        );
      },
    );
    await t.test(
      'Origin обязателен для login/register/logout/settings; CORS без wildcard',
      async () => {
        for (const path of [
          '/auth/login',
          '/auth/register',
          '/auth/logout',
          '/settings',
        ])
          for (const bad of [
            '',
            'null',
            'http://finora.test.evil',
            'https://evil.example',
          ]) {
            const response = await request(
              path,
              path === '/settings' ? 'PATCH' : 'POST',
              {},
              firstCookie,
              { Origin: bad },
            );
            assert.equal(response.status, 403);
            assert.equal(
              response.headers.get('access-control-allow-origin'),
              null,
            );
          }
        const response = await request(
          '/auth/me',
          'GET',
          undefined,
          firstCookie,
        );
        assert.equal(
          response.headers.get('access-control-allow-origin'),
          origin,
        );
        assert.equal(
          response.headers.get('access-control-allow-credentials'),
          'true',
        );
      },
    );
    await t.test(
      'границы validation, mass assignment, malformed JSON и размер тела',
      async () => {
        for (const patch of [
          { email: 'bad' },
          { password: 'short' },
          { displayName: '' },
          { timeZone: '+03:00' },
          { timeZone: 'Mars/Olympus' },
          { baseCurrency: 'ZZZ' },
          { userId: firstId },
          { categoryId: randomUUID() },
          { passwordHash: 'hash' },
          { displayName: 'x'.repeat(101) },
          { email: null },
        ]) {
          const response = await request('/auth/register', 'POST', {
            ...account('invalid@example.com'),
            ...patch,
          });
          assert.equal(response.status, 400);
          assert.equal((await json(response)).type, 'validation_error');
        }
        for (const body of [null, [], {}, { email: 'a@example.com' }])
          assert.equal(
            (await request('/auth/register', 'POST', body)).status,
            400,
          );
        const badJson = await fetch(`${base}/auth/login`, {
          method: 'POST',
          headers: { Origin: origin, 'Content-Type': 'application/json' },
          body: '{',
        });
        assert.equal(badJson.status, 400);
        assert.equal((await json(badJson)).type, 'validation_error');
        assert.equal(
          (await request('/auth/login', 'POST', { x: 'x'.repeat(17000) }))
            .status,
          413,
        );
      },
    );
    await t.test(
      'settings использует только владельца JWT, не принимает чужие ID и связи',
      async () => {
        assert.equal((await request('/settings')).status, 401);
        const data = {
          displayName: 'Своё новое имя',
          baseCurrency: 'EUR',
          timeZone: 'UTC',
        };
        const response = await request('/settings', 'PATCH', data, firstCookie);
        assert.equal(response.status, 200);
        assert.equal((await json(response)).id, firstId);
        assert.equal(
          (
            await fixture.client.user.findUniqueOrThrow({
              where: { id: seedId('family') },
            })
          ).displayName,
          demoProfiles[1].name,
        );
        for (const extra of [
          { userId: seedId('family') },
          { id: seedId('family') },
          { email: 'other@example.com' },
          { themePreference: 'dark' },
          { categoryId: seedId('family:category:groceries') },
        ])
          assert.equal(
            (
              await request(
                '/settings',
                'PATCH',
                { ...data, ...extra },
                firstCookie,
              )
            ).status,
            400,
          );
        for (const id of [seedId('family'), 'not-a-uuid'])
          assert.equal(
            (await request(`/settings/${id}`, 'PATCH', data, firstCookie))
              .status,
            404,
          );
        const me = await request(
          '/settings',
          'GET',
          undefined,
          firstCookie,
          {},
        );
        assert.equal((await json(me)).displayName, data.displayName);
      },
    );
    await t.test(
      'baseCurrency блокируется каждым типом финансовых данных, включая только audit',
      async () => {
        for (const entity of [
          'transaction',
          'budget',
          'recurring',
          'audit',
        ] as const) {
          const user = await auth.register(account(`${entity}@example.com`));
          const category = await fixture.client.category.findFirstOrThrow({
            where: { userId: user.id, type: 'EXPENSE' },
          });
          const baseData = { userId: user.id, categoryId: category.id };
          if (entity === 'transaction')
            await fixture.client.transaction.create({
              data: {
                ...baseData,
                type: 'EXPENSE',
                amount: '0.01',
                currency: 'RUB',
                exchangeRate: '1',
                amountInBaseCurrency: '0.01',
                description: '',
                transactionDate: new Date('2026-09-14'),
                source: 'MANUAL',
              },
            });
          if (entity === 'budget')
            await fixture.client.budget.create({
              data: {
                ...baseData,
                year: 2026,
                month: 9,
                limitAmount: '9999999999999999.99999999',
              },
            });
          if (entity === 'recurring')
            await fixture.client.recurringTransaction.create({
              data: {
                ...baseData,
                type: 'EXPENSE',
                amount: '1',
                currency: 'RUB',
                exchangeRate: '1',
                description: '',
                frequency: 'MONTHLY',
                dayOfMonth: 31,
                startDate: new Date('2026-09-01'),
                nextOccurrenceDate: new Date('2026-09-30'),
                archivedAt: new Date('2026-09-14'),
              },
            });
          if (entity === 'audit')
            await fixture.client.auditEntry.create({
              data: {
                userId: user.id,
                entityType: 'Transaction',
                entityId: randomUUID(),
                action: 'DELETE',
                before: { amount: '1' },
              },
            });
          const cookie = `finora_session=${await sessions.sign(user.id)}`;
          const response = await request(
            '/settings',
            'PATCH',
            { displayName: 'Проверка', baseCurrency: 'USD', timeZone: 'UTC' },
            cookie,
          );
          assert.equal(response.status, 409, entity);
          const same = await request(
            '/settings',
            'PATCH',
            { displayName: 'Проверка', baseCurrency: 'RUB', timeZone: 'UTC' },
            cookie,
          );
          assert.equal(same.status, 200);
          assert.equal((await json(same)).baseCurrencyLocked, true);
        }
      },
    );
    await t.test(
      'блокировка строки ждёт конкурентную financial write и проверяет её commit',
      async () => {
        const user = await auth.register(account('lock@example.com'));
        const connection = new pg.Client({
          connectionString: fixture.runtimeUrl,
        });
        await connection.connect();
        try {
          await connection.query('BEGIN');
          await connection.query(
            'SELECT id FROM users WHERE id=$1 FOR UPDATE',
            [user.id],
          );
          const update = users.update(user.id, {
            displayName: 'Тест',
            baseCurrency: 'USD',
            timeZone: 'UTC',
          });
          // Сначала фиксируем финансовое свидетельство под той же блокировкой.
          await connection.query(
            'INSERT INTO audit_entries (id,"userId","entityType","entityId",action,before) VALUES ($1,$2,\'Transaction\',$3,\'DELETE\',\'{"amount":"1"}\')',
            [randomUUID(), user.id, randomUUID()],
          );
          await connection.query('COMMIT');
          await assert.rejects(
            update,
            (error) =>
              error instanceof Error && error.message.includes('валюту'),
          );
        } finally {
          await connection.end();
        }
      },
    );
    await t.test(
      'лимиты login 10/мин и register 5/час, Retry-After и Problem contract',
      async () => {
        for (const [path, limit] of [
          ['/auth/login', 10],
          ['/auth/register', 5],
        ] as const) {
          for (let index = 0; index < limit; index++)
            assert.equal(
              (
                await request(path, 'POST', {}, undefined, {
                  'X-Forwarded-For': '198.51.100.1',
                })
              ).status,
              400,
            );
          const response = await request(path, 'POST', {}, undefined, {
            'X-Forwarded-For': '198.51.100.1',
          });
          assert.equal(response.status, 429);
          assert.ok(Number(response.headers.get('retry-after')) > 0);
          assert.equal((await json(response)).type, 'rate_limit');
          for (const alias of [path + '/', path.toUpperCase()])
            assert.equal(
              (
                await request(alias, 'POST', {}, undefined, {
                  'X-Forwarded-For': '198.51.100.1',
                })
              ).status,
              429,
            );
        }
      },
    );
    await t.test(
      'logout удаляет cookie, истёкшая сессия тоже выходит; Secure задаётся конфигурацией',
      async () => {
        const response = await request(
          '/auth/logout',
          'POST',
          undefined,
          firstCookie,
        );
        assert.equal(response.status, 204);
        assert.match(
          response.headers.get('set-cookie')!,
          /finora_session=; Path=\/; HttpOnly; SameSite=Strict; Max-Age=0/,
        );
        assert.equal((await request('/auth/logout', 'POST')).status, 204);
        assert.equal((await request('/auth/me')).status, 401);
        // Stateless logout не обещает отзыва ранее скопированной cookie.
        assert.equal(
          (await request('/auth/me', 'GET', undefined, firstCookie)).status,
          200,
        );
        process.env['AUTH_COOKIE_SECURE'] = 'true';
        const secure = new SessionService();
        assert.match(secure.cookie('test'), /; Secure$/);
        assert.match(secure.cookie('', true), /; Secure$/);
      },
    );
  } finally {
    await app.close();
    await fixture.close();
    for (const key of [
      'DATABASE_URL',
      'AUTH_SECRET',
      'AUTH_ORIGINS',
      'AUTH_COOKIE_SECURE',
      'AUTH_TRUST_PROXY',
    ]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
