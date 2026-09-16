import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export function createDatabaseClient(url: string) {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      // Только `connectionTimeoutMillis` — клиентский таймер `pg`: он
      // ограничивает ожидание установления TCP/handshake, а не выполнение
      // уже отправленного запроса, поэтому не может оставить «занятое»
      // соединение в пуле (см. ниже).
      connectionTimeoutMillis: 3000,
      // `lock_timeout`/`statement_timeout` — серверные параметры Postgres
      // (session GUC, `node_modules/pg/lib/client.js` шлёт их в startup-
      // пакете, подтверждено по `connection-parameters.js`). Они
      // гарантированно завершают (с ошибкой САМОГО Postgres, то есть с
      // настоящим `ReadyForQuery` и освобождением соединения) зависшее
      // ожидание блокировки или сам запрос — раньше их не было вовсе, и
      // зависшая транзакция (`SELECT ... FOR UPDATE` в lockOwner) могла
      // держать соединение пула занятым неограниченно (см. REPORT.md,
      // remote CI FAIL на Stage 9 stress).
      //
      // Ранее здесь также стоял клиентский `query_timeout: 3000` — он
      // строго МЕНЬШЕ обоих серверных таймаутов. Разбор `pg@8.23.0`
      // (`lib/client.js:702-731`) показал: клиентский `query_timeout` при
      // срабатывании лишь отклоняет промис на стороне Node — он НЕ
      // отправляет Cancel Request и не рвёт соединение для уже отправленного
      // (non-pipelined) запроса. Реальный backend Postgres продолжает
      // выполнять/ждать блокировку по этому запросу, соединение остаётся
      // «занятым» на wire-уровне (`_activeQuery`/`readyForQuery=false`), а
      // `@prisma/adapter-pg` (`PgTransaction.commit()`/`rollback()`,
      // `dist/index.js:712-720`) всё равно безусловно вызывает
      // `client.release()` — `pg-pool` (`lib/index.js:_release`) не
      // проверяет `readyForQuery` и кладёт такой клиент в `_idle` как
      // исправный. Следующий запрос получает этот «занятый» pool-slot и
      // сам встаёт в очередь позади невидимого ему запроса — таким образом
      // клиентский `query_timeout`, срабатывающий РАНЬШЕ серверных
      // таймаутов, был не защитой, а единственным механизмом, способным
      // создать описанное выше зомби-соединение: без него `commit()`/
      // `rollback()` вызываются только после того, как промис реально
      // разрешился настоящим ответом Postgres (успехом либо ошибкой
      // `lock_timeout`/`statement_timeout`), то есть строго после
      // `ReadyForQuery`, и `client.release()` кладёт в пул только
      // действительно готовое соединение. Поэтому `query_timeout` убран, а
      // не переупорядочен: любое положительное значение либо повторяет
      // этот риск (если меньше серверных таймаутов), либо избыточно (если
      // больше — серверные таймауты уже разрешат промис раньше).
      lock_timeout: 5000,
      // 35000 — не 20000: `export()` (`transactions.service.ts`) выполняет
      // несколько batch-запросов (`EXPORT_BATCH_SIZE=2000`) внутри ОДНОЙ
      // интерактивной транзакции Prisma с её собственным лимитом
      // `timeout: 30_000` на транзакцию целиком. `statement_timeout` —
      // per-statement лимит Postgres, а не per-transaction: значение ниже
      // 30_000 могло прервать один легитимный batch раньше, чем Prisma сама
      // сочла бы транзакцию просроченной. 35000 даёт per-statement лимиту
      // запас над всем transaction-бюджетом export(), не ослабляя защиту
      // lockOwner() — там связывающий таймаут именно `lock_timeout` (5000),
      // он не зависит от величины `statement_timeout`.
      statement_timeout: 35000,
    }),
  });
}

export function databaseUrl(): string {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('Не задан DATABASE_URL');
  return url;
}
