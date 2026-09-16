import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { test } from 'node:test';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { databaseFixture } from './database-fixture.js';

// Значения намеренно малы (не совпадают с apps/api/src/prisma/client.ts) —
// тест проверяет сам механизм (server-side timeout -> реальный ReadyForQuery
// -> безопасный release() в pg-pool), а не конкретные production-цифры.
function smallTimeoutClient(url: string) {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      connectionTimeoutMillis: 3000,
      lock_timeout: 300,
      statement_timeout: 500,
    }),
  });
}

await test('после server-side DB timeout соединение пула остаётся исправным для следующего запроса', async (t) => {
  const fixture = await databaseFixture();
  const client = smallTimeoutClient(fixture.runtimeUrl);
  try {
    const user = await fixture.client.user.create({
      data: {
        email: 'timeout-policy@finora.example',
        passwordHash: 'fixture',
        displayName: 'Timeout policy fixture',
        baseCurrency: 'RUB',
        timeZone: 'Europe/Moscow',
        themePreference: 'light',
      },
    });

    await t.test(
      'lock wait: lock_timeout завершает зависший SELECT ... FOR UPDATE, следующий запрос через тот же pool проходит быстро',
      async () => {
        let releaseLock: () => void = () => {};
        const lockAcquired = new Promise<void>((resolveAcquired) => {
          const holder = fixture.client.$transaction(async (db) => {
            await db.$executeRaw`SELECT id FROM users WHERE id = ${user.id}::uuid FOR UPDATE`;
            resolveAcquired();
            await new Promise<void>((resolve) => {
              releaseLock = resolve;
            });
          });
          void holder;
        });
        await lockAcquired;
        try {
          await assert.rejects(
            client.$transaction(async (db) => {
              await db.$executeRaw`SELECT id FROM users WHERE id = ${user.id}::uuid FOR UPDATE`;
            }),
            (e: unknown) => /lock timeout/i.test(String(e)),
          );
        } finally {
          releaseLock();
        }
        const started = Date.now();
        const row = await client.user.findUniqueOrThrow({
          where: { id: user.id },
        });
        assert.equal(row.id, user.id);
        assert.ok(
          Date.now() - started < 2000,
          'следующий запрос не должен вставать в очередь позади зомби-соединения',
        );
      },
    );

    await t.test(
      'long-running statement: statement_timeout завершает запрос без блокировки, следующий запрос через тот же pool проходит быстро',
      async () => {
        await assert.rejects(
          client.$transaction(async (db) => {
            await db.$executeRaw`SELECT pg_sleep(2)`;
          }),
          (e: unknown) => /statement timeout/i.test(String(e)),
        );
        const started = Date.now();
        const row = await client.user.findUniqueOrThrow({
          where: { id: user.id },
        });
        assert.equal(row.id, user.id);
        assert.ok(
          Date.now() - started < 2000,
          'следующий запрос не должен вставать в очередь позади зомби-соединения',
        );
      },
    );

    await sleep(50);
  } finally {
    await client.$disconnect();
    await fixture.close();
  }
});

// Малые интервалы (не совпадают с apps/api/src/prisma/client.ts, где
// interactive transaction timeout export() = 30000, statement_timeout =
// 35000) — тест проверяет именно ordering-механизм (Prisma interactive
// transaction timeout короче статически ещё выполняющегося на backend
// SQL-statement, statement_timeout ещё длиннее обоих), а не конкретные
// production-цифры.
function interactiveOrderingClient(url: string) {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      connectionTimeoutMillis: 3000,
      lock_timeout: 5000,
      statement_timeout: 900,
    }),
  });
}

await test(
  'interactive transaction timeout короче ещё выполняющегося statement (< statement_timeout): следующий запрос через тот же pool не встаёт в зомби-очередь',
  async () => {
    const fixture = await databaseFixture();
    const client = interactiveOrderingClient(fixture.runtimeUrl);
    try {
      const startedTx = Date.now();
      // pg_sleep(0.6) = 600мс: дольше interactive transaction timeout (300мс),
      // короче statement_timeout (900мс) — воспроизводит окно "30s Prisma tx
      // timeout / 30-35s backend всё ещё выполняется / 35s statement_timeout"
      // в масштабе сотен миллисекунд.
      await assert.rejects(
        client.$transaction(
          async (db) => {
            await db.$executeRaw`SELECT pg_sleep(0.6)`;
          },
          { timeout: 300, maxWait: 5000 },
        ),
        (e: unknown) => /expired transaction|timeout/i.test(String(e)),
      );
      const txSettledAfter = Date.now() - startedTx;
      // Промис $transaction() реально settle'ится не раньше, чем реально
      // выполняющийся statement завершится на backend (Prisma сериализует
      // закрытие транзакции по timeout позади ещё не завершённой операции
      // через internal operationQueue — не отправляет CancelRequest).
      // Значит наблюдаемое время НЕ может быть близко к 300мс.
      assert.ok(
        txSettledAfter >= 550,
        `$transaction() с timeout=300 settled за ${txSettledAfter}мс — ожидалось ожидание реального завершения statement (>=550мс), иначе промис здесь не является надёжным сигналом "соединение уже освобождено"`,
      );

      const startedNext = Date.now();
      const row = await client.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
      assert.equal(row[0]?.ok, 1);
      assert.ok(
        Date.now() - startedNext < 300,
        'следующий запрос не должен вставать в очередь позади ещё не освобождённого соединения',
      );

      // Дополнительный наблюдаемый сигнал независимо от клиента Prisma:
      // на самом PostgreSQL не должно остаться ни активного pg_sleep, ни
      // висящей "idle in transaction" сессии этой БД.
      const stale = await fixture.admin.query<{
        pid: number;
        state: string;
        query: string;
      }>(
        `SELECT pid, state, query FROM pg_stat_activity
         WHERE datname = $1 AND pid <> pg_backend_pid()
           AND (query ILIKE '%pg_sleep%' OR state = 'idle in transaction')`,
        [fixture.name],
      );
      assert.deepEqual(
        stale.rows,
        [],
        'на PostgreSQL не должно остаться зависшего statement/transaction после settle Prisma-таймаута',
      );
    } finally {
      await client.$disconnect();
      await fixture.close();
    }
  },
);
