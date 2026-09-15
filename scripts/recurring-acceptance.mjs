import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { rm } from 'node:fs/promises';

const exec = promisify(execFile);

// `apps/api/dist-test/test/recurring-scheduler-worker.js` — не входной
// артефакт acceptance, а её собственный build-шаг. Раньше файл появлялся
// только как побочный эффект отдельного `pnpm --filter @finora/api test`
// (тот компилирует apps/api/test/**/*.ts через tsconfig.test.json перед
// `node --test`), из-за чего на чистом checkout/CI runner, где этот шаг не
// выполнялся первым, exec ниже падал с MODULE_NOT_FOUND вместо ожидаемой
// ошибки подключения к PostgreSQL. Компилируем worker сама, тем же
// tsconfig.test.json, каждый прогон — не полагаясь на то, что уже могло
// остаться от прошлых команд.
async function buildSchedulerWorker() {
  await rm('apps/api/dist-test', { recursive: true, force: true });
  await exec('pnpm', [
    '--filter',
    '@finora/api',
    'exec',
    'tsc',
    '-p',
    'tsconfig.test.json',
  ]);
}

function todayInZone(timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return ['year', 'month', 'day']
    .map((type) => parts.find((p) => p.type === type).value)
    .join('-');
}
function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
// Тот же клэмп, что и серверный nextMonthlyOccurrence: месяц считается от
// исходного dayOfMonth, короткий месяц клэмпится к последнему дню.
function nextMonth(date) {
  const [y, m, d] = date.split('-').map(Number);
  let year = y,
    month = m + 1;
  if (month > 12) {
    year += 1;
    month = 1;
  }
  const day = Math.min(d, daysInMonth(year, month));
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

// Реальный production scheduler в Docker использует системные часы без
// подмены — поэтому правило создаётся с startDate = сегодня в timeZone
// владельца (Europe/Moscow у seed-профиля), чтобы occurrence была due сразу.
// Триггером немедленного tick служит restart api (onModuleInit запускает
// проход сразу при старте) — тот же restart, что требует ROADMAP Stage 8.
export async function recurringAcceptance(url, compose, databaseHash) {
  const request = (path, method = 'GET', data, cookie) =>
    fetch(`${url}/api/v1${path}`, {
      method,
      headers: {
        Origin: url,
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  async function login(email, password) {
    const r = await request('/auth/login', 'POST', { email, password });
    assert.equal(r.status, 200);
    return r.headers.get('set-cookie').split(';')[0];
  }
  const personal = await login(
    'personal@finora.example',
    'Finora-Personal-2026!',
  );
  const family = await login('family@finora.example', 'Finora-Family-2026!');
  const options = await (
    await request('/categories/options', 'GET', undefined, personal)
  ).json();
  const categoryId = options.find((c) => c.name === 'Продукты').id;
  const startDate = todayInZone('Europe/Moscow');
  const input = {
    amount: '999.99',
    currency: 'RUB',
    categoryId,
    type: 'EXPENSE',
    description: 'Compose Stage 8 recurring',
    startDate,
  };
  const created = await request(
    '/recurring-transactions',
    'POST',
    input,
    personal,
  );
  assert.equal(created.status, 201, await created.clone().text());
  const rule = await created.json();
  assert.equal(rule.nextOccurrenceDate, startDate);
  assert.equal(rule.hasGeneratedTransactions, false);
  for (const method of ['GET', 'PATCH', 'DELETE'])
    assert.equal(
      (
        await request(
          `/recurring-transactions/${rule.id}`,
          method,
          method === 'PATCH' ? { description: 'x' } : undefined,
          family,
        )
      ).status,
      404,
    );
  async function generatedCount() {
    const list = await (
      await request(
        `/transactions?categoryId=${categoryId}&pageSize=50`,
        'GET',
        undefined,
        personal,
      )
    ).json();
    return list.items.filter((t) => t.recurringTransactionId === rule.id)
      .length;
  }
  // Restart форсирует немедленный scheduler tick при старте API (onModuleInit).
  await compose('restart', 'api');
  await compose('up', '-d', '--wait', '--wait-timeout', '180');
  assert.equal(await generatedCount(), 1);
  const afterFirst = await (
    await request(
      `/recurring-transactions/${rule.id}`,
      'GET',
      undefined,
      personal,
    )
  ).json();
  assert.equal(afterFirst.nextOccurrenceDate, nextMonth(startDate));
  assert.equal(afterFirst.hasGeneratedTransactions, true);
  // Второй restart на то же логическое «сегодня»: occurrence не due повторно,
  // повторный tick не создаёт дубль.
  await compose('restart', 'api');
  await compose('up', '-d', '--wait', '--wait-timeout', '180');
  assert.equal(await generatedCount(), 1);
  assert.equal(
    (
      await request(
        `/recurring-transactions/${rule.id}`,
        'GET',
        undefined,
        personal,
      )
    ).status,
    200,
  );
  // Правило уже сгенерировало операцию — DELETE архивирует, не удаляет физически.
  const removal = await (
    await request(
      `/recurring-transactions/${rule.id}`,
      'DELETE',
      undefined,
      personal,
    )
  ).json();
  assert.equal(removal.outcome, 'archived');
  const hash = await databaseHash();
  await compose('exec', '-T', 'api', 'node', 'dist/prisma/seed.js');
  assert.equal(await databaseHash(), hash);
  await compose('restart', 'api');
  await compose('up', '-d', '--wait', '--wait-timeout', '180');
  assert.equal(await databaseHash(), hash);
  assert.equal(await generatedCount(), 1);
  console.log(
    'PASS Stage 8 Compose: recurring create/ownership/archive, catch-up на restart без дублей, seed/restart persistence',
  );
}

// Композитный сценарий: due occurrence существует именно в момент, когда
// PostgreSQL недоступна. Отдельно от generic outage-проверки выше (та не
// создаёт recurring-правил вообще) и от recurringAcceptance (та не трогает
// PostgreSQL) — здесь оба условия совмещены в одном сценарии, как требует
// Stage 8 acceptance: due occurrence → PostgreSQL недоступна → recurring
// processing РЕАЛЬНО ПЫТАЕТСЯ выполниться → попытка терпит controlled
// failure → ни Transaction, ни продвинутый указатель, ни audit не пережили
// отказ → PostgreSQL восстановлена → следующий catch-up создаёт ровно одну
// Transaction → повтор не создаёт дополнительных.
//
// На время outage внутренний setInterval-scheduler самого api-контейнера
// принудительно отключён (RECURRING_SCHEDULER_DISABLED=true) — иначе момент
// его тика относительно момента восстановления PostgreSQL был бы
// недетерминированным (гонка с реальным таймером). Вместо него РЕАЛЬНАЯ
// попытка обработки выполняется явно и детерминированно: тот же test-only
// harness, что и Stage 8 multi-process concurrency тесты
// (`apps/api/test/recurring-scheduler-worker.ts`, компилируется в
// `dist-test/test/recurring-scheduler-worker.js`) — прямой вызов
// production-функции `runSchedulerTick` из тестового процесса, без HTTP
// backdoor в production-коде. Harness подключается по обычному
// `DATABASE_URL` к тому же PostgreSQL этого compose-стека через host-порт
// (`docker compose port postgres 5432`) — только сейчас контейнер
// остановлен, поэтому попытка подключения детерминированно проваливается
// (`connectionTimeoutMillis: 3000` в `createDatabaseClient` — встроенный
// таймаут pg-адаптера, а не sleep, добавленный тестом ради видимости
// «попытки»).
//
// Восстановление после PostgreSQL всё ещё триггерится через `restart api`
// (как и раньше) — это отдельная, более сильная проверка: не прямой вызов
// engine, а настоящий production-путь (`onModuleInit` форсирует tick сразу
// при старте контейнера). `restart api` НЕ используется для самой попытки
// во время outage, поскольку не работает, пока PostgreSQL недоступна:
// `scripts/start-container.sh` внутри контейнера сначала синхронно ждёт
// PostgreSQL (`wait-database.mjs`) и накатывает миграции ДО запуска
// `node dist/src/main.js`, то есть при недоступной PostgreSQL такой restart
// не поднимет API вообще (проверено: реальный `docker compose restart api`
// при остановленной PostgreSQL оставляет api недоступным — 502 от web, а не
// «процесс жив, просто scheduler не смог записать»). Именно поэтому для
// самой попытки во время outage используется прямой вызов harness, а не
// restart контейнера.
export async function recurringOutageAcceptance(url, compose, env) {
  await buildSchedulerWorker();
  const request = (path, method = 'GET', data, cookie) =>
    fetch(`${url}/api/v1${path}`, {
      method,
      headers: {
        Origin: url,
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  async function login(email, password) {
    const r = await request('/auth/login', 'POST', { email, password });
    assert.equal(r.status, 200);
    return r.headers.get('set-cookie').split(';')[0];
  }
  async function psql(sql) {
    return (
      await compose(
        'exec',
        '-T',
        'postgres',
        'psql',
        '-U',
        'finora_migrator',
        '-d',
        'finora',
        '-Atc',
        sql,
      )
    ).trim();
  }
  // PostgreSQL здорова: пересоздаём api с отключённым scheduler, чтобы
  // ни один tick не выполнился до явного восстановления ниже.
  env.RECURRING_SCHEDULER_DISABLED = 'true';
  await compose('up', '-d', '--wait', '--wait-timeout', '180', 'api');
  const personal = await login(
    'personal@finora.example',
    'Finora-Personal-2026!',
  );
  const options = await (
    await request('/categories/options', 'GET', undefined, personal)
  ).json();
  const categoryId = options.find((c) => c.name === 'Продукты').id;
  const startDate = todayInZone('Europe/Moscow');
  const created = await request(
    '/recurring-transactions',
    'POST',
    {
      amount: '555.55',
      currency: 'RUB',
      categoryId,
      type: 'EXPENSE',
      description: 'Stage 8 outage acceptance',
      startDate,
    },
    personal,
  );
  assert.equal(created.status, 201, await created.clone().text());
  const rule = await created.json();
  assert.equal(rule.hasGeneratedTransactions, false);

  // Порт нужен, пока PostgreSQL ещё здорова — после stop контейнер не даёт
  // разрешить свой актуальный host-порт.
  const postgresAddress = (await compose('port', 'postgres', '5432')).trim();
  const outageDatabaseUrl = `postgresql://finora_runtime:finora_local_runtime@${postgresAddress}/finora`;

  await compose('stop', 'postgres');
  // API-процесс уже запущен (до outage) и не зависит от PostgreSQL для
  // простого health/live — тот же инвариант, что и в generic outage-тесте
  // выше, только теперь с реально due occurrence, ожидающей обработки.
  assert.equal((await fetch(`${url}/health/live`)).status, 200);

  // Реальная попытка processing due occurrence, пока PostgreSQL действительно
  // недоступна (см. обоснование harness выше).
  const attempt = await exec('node', [
    'apps/api/dist-test/test/recurring-scheduler-worker.js',
    outageDatabaseUrl,
    new Date().toISOString(),
  ]).then(
    (result) => ({ crashed: false, ...result }),
    (error) => ({ crashed: true, stderr: error.stderr ?? String(error) }),
  );
  assert.equal(
    attempt.crashed,
    true,
    'Попытка обработки во время реальной недоступности PostgreSQL должна завершиться отказом подключения, а не тихим успехом',
  );
  assert.match(
    attempt.stderr,
    /(ECONNREFUSED|Can't reach database server|connect)/i,
    `Ожидалась ошибка подключения к недоступной PostgreSQL, получено: ${attempt.stderr}`,
  );
  console.log(
    `PASS Stage 8 outage attempt: реальный вызов runSchedulerTick во время недоступности PostgreSQL завершился controlled failure (${attempt.stderr.trim().split('\n')[0]})`,
  );

  await compose('start', 'postgres');
  const postgres = (await compose('ps', '-q', 'postgres')).trim();
  assert.notEqual(postgres, '', 'Контейнер PostgreSQL должен быть запущен');
  for (let i = 0; ; i++) {
    const ready = await psql('SELECT 1').catch(() => null);
    if (ready === '1') break;
    if (i >= 60)
      throw new Error('PostgreSQL не восстановилась после Stage 8 outage');
    await setTimeout(1000);
  }
  // Реальная попытка выше упала внутри processOneOccurrence ДО открытия
  // DB transaction (сам connect к PostgreSQL не удался) — engine.ts ничего
  // не мог записать. Проверяем это фактом, а не предположением: указатель
  // правила не продвинут и не появилось audit-записей о нём, то есть попытка
  // не оставила ни одной половинчатой записи ни в одной из двух таблиц,
  // которые processOneOccurrence в норме пишет атомарно вместе.
  assert.equal(
    await psql(
      `SELECT count(*) FROM transactions WHERE "recurringTransactionId" = '${rule.id}'`,
    ),
    '0',
    'occurrence не должна существовать, пока PostgreSQL была недоступна',
  );
  assert.equal(
    await psql(
      `SELECT "nextOccurrenceDate"::text FROM recurring_transactions WHERE id = '${rule.id}'`,
    ),
    startDate,
  );
  assert.equal(
    await psql(
      `SELECT count(*) FROM audit_entries WHERE "entityId" = '${rule.id}' AND action IN ('UPDATE', 'ARCHIVE')`,
    ),
    '0',
  );
  // Восстановление: PostgreSQL снова здорова — пересоздаём api со scheduler
  // включённым обратно; onModuleInit форсирует немедленный catch-up tick.
  env.RECURRING_SCHEDULER_DISABLED = '';
  await compose('up', '-d', '--wait', '--wait-timeout', '180', 'api');
  async function generatedCount() {
    return Number(
      await psql(
        `SELECT count(*) FROM transactions WHERE "recurringTransactionId" = '${rule.id}'`,
      ),
    );
  }
  await waitForCatchUp(generatedCount);
  assert.equal(await generatedCount(), 1);
  const afterRecovery = await (
    await request(
      `/recurring-transactions/${rule.id}`,
      'GET',
      undefined,
      personal,
    )
  ).json();
  assert.equal(afterRecovery.hasGeneratedTransactions, true);
  assert.equal(afterRecovery.nextOccurrenceDate, nextMonth(startDate));
  // Повторный restart на ту же логическую дату — без дублей.
  await compose('restart', 'api');
  await compose('up', '-d', '--wait', '--wait-timeout', '180', 'api');
  assert.equal(await generatedCount(), 1);
  console.log(
    'PASS Stage 8 Compose: due occurrence переживает недоступность PostgreSQL без partial state, catch-up после восстановления создаёт ровно одну Transaction, повтор не дублирует',
  );
}
// onModuleInit форсирует tick сразу при старте, но сам HTTP healthcheck
// становится healthy раньше, чем этот асинхронный tick успевает
// закоммититься. Опрос — не retry ради маскировки гонки в самом engine.ts
// (там гонки нет, см. Stage 8 concurrency-тесты), а ожидание одного известного
// заранее события в другом процессе (Docker-контейнере), результат которого
// не зависит от числа попыток.
async function waitForCatchUp(generatedCount) {
  for (let i = 0; ; i++) {
    if ((await generatedCount()) >= 1) return;
    if (i >= 30) return; // финальный assert.equal(..., 1) даст точную диагностику
    await setTimeout(1000);
  }
}
