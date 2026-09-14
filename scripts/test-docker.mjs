import assert from 'node:assert/strict';
import { financeAcceptance } from './finance-acceptance.mjs';
import { budgetAcceptance } from './budget-acceptance.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';

const exec = promisify(execFile);
const checkout = await mkdtemp(join(tmpdir(), 'finora-compose-'));
const project = `finora-acceptance-${process.pid}`;
let browserOutput;
const env = {
  ...process.env,
  WEB_PORT: '0',
  POSTGRES_PORT: '0',
  SEED_ANCHOR_DATE: '2026-09-01',
};
async function compose(...args) {
  const result = await exec('docker', ['compose', '-p', project, ...args], {
    cwd: checkout,
    env,
    maxBuffer: 16 * 1024 * 1024,
    timeout: 1200000,
  });
  return result.stdout;
}
async function waitFor(description, probe, expected) {
  const timeout = 180000;
  const signal = AbortSignal.timeout(timeout);
  let lastState = 'ещё не проверено';
  try {
    while (true) {
      signal.throwIfAborted();
      lastState = await probe(signal);
      signal.throwIfAborted();
      if (lastState === expected) {
        console.log(`${description}: ${lastState}`);
        return;
      }
      await setTimeout(1000, undefined, { signal });
    }
  } catch (error) {
    throw new Error(
      `Не удалось дождаться ${description} (лимит ${timeout / 1000} с); последнее состояние: ${lastState}`,
      { cause: error },
    );
  }
}
async function databaseHash() {
  const parts = [];
  for (const table of [
    'users',
    'categories',
    'transactions',
    'budgets',
    'recurring_transactions',
    'audit_entries',
  ]) {
    parts.push(
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
        `SELECT row_to_json(t)::text FROM (SELECT * FROM ${table} ORDER BY id) t`,
      ),
    );
  }
  return createHash('sha256').update(parts.join('\n')).digest('hex');
}
async function verifyHttp() {
  const address = (await compose('port', 'web', '80')).trim();
  const url = `http://${address}`;
  for (const path of [
    '/',
    '/transactions',
    '/health/live',
    '/health/ready',
    '/docs',
    '/docs/openapi.json',
    '/docs/swagger-ui-bundle.js',
  ]) {
    const response = await fetch(`${url}${path}`);
    assert.equal(response.status, 200, path);
    await response.text();
  }
  assert.equal((await fetch(`${url}/api/v1/unknown`)).status, 404);
  assert.equal((await fetch(`${url}/api/v1/transactions`)).status, 401);
  const raw = await compose('ps', '--format', 'json');
  const services = raw
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.equal(services.length, 3);
  for (const service of services)
    assert.equal(service.Health, 'healthy', service.Service);
  console.log(`Web/API/Swagger доступны: ${url}; все 3 сервиса healthy`);
  return url;
}
try {
  const listed = await exec('git', [
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '-z',
  ]);
  for (const file of new Set(listed.stdout.split('\0').filter(Boolean))) {
    const destination = join(checkout, file);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(file, destination);
  }
  console.log(
    'Чистая копия исходников без node_modules/.env; docker compose up без --build',
  );
  await compose('down', '-v', '--remove-orphans');
  await compose('up', '-d', '--wait', '--wait-timeout', '180');
  const url = await verifyHttp();
  const before = await databaseHash();
  assert.equal(
    (
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
        'SELECT count(*) FROM transactions',
      )
    ).trim(),
    '288',
  );
  for (let i = 0; i < 3; i++)
    console.log(
      (
        await compose('exec', '-T', 'api', 'node', 'dist/prisma/seed.js')
      ).trim(),
    );
  assert.equal(await databaseHash(), before);
  await compose('stop', 'postgres');
  assert.equal((await fetch(`${url}/health/live`)).status, 200);
  assert.equal((await fetch(`${url}/health/ready`)).status, 503);
  // Compose v2 поддерживает --wait у up, но не у start.
  await compose('start', 'postgres');
  const postgres = (await compose('ps', '-q', 'postgres')).trim();
  assert.notEqual(postgres, '', 'Контейнер PostgreSQL должен быть запущен');
  await waitFor(
    'PostgreSQL healthy',
    async (signal) => {
      const result = await exec(
        'docker',
        ['inspect', '--format', '{{.State.Health.Status}}', postgres],
        { env, signal, timeout: 5000 },
      );
      return result.stdout.trim();
    },
    'healthy',
  );
  await waitFor(
    '/health/ready HTTP 200 после восстановления PostgreSQL',
    async (signal) => {
      try {
        const response = await fetch(`${url}/health/ready`, {
          signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
        });
        await response.body?.cancel();
        return String(response.status);
      } catch (error) {
        signal.throwIfAborted();
        return `${error.name}: ${error.message}`;
      }
    },
    '200',
  );
  await compose('up', '-d', '--wait', '--wait-timeout', '180');
  await verifyHttp();
  await compose('down');
  await compose('up', '-d', '--wait', '--wait-timeout', '180');
  await verifyHttp();
  assert.equal(await databaseHash(), before);
  const financeUrl = `http://${(await compose('port', 'web', '80')).trim()}`;
  env.AUTH_ORIGINS = financeUrl;
  await compose('up', '-d', '--wait', '--wait-timeout', '180', 'api');
  await financeAcceptance(financeUrl, compose, databaseHash);
  await budgetAcceptance(financeUrl, compose, databaseHash);
  if (process.argv.includes('--browser')) {
    const resultsRoot = resolve('apps/web/test-results');
    await mkdir(resultsRoot, { recursive: true });
    browserOutput = await mkdtemp(join(resultsRoot, 'compose-'));
    const browserEnv = {
      ...process.env,
      FINORA_PLAYWRIGHT_OUTPUT_DIR: browserOutput,
    };
    console.log(`Browser artifacts: ${browserOutput}`);
    // Сначала сохранены все прежние проверки dataset/readiness/restart.
    const browserUrl = `http://${(await compose('port', 'web', '80')).trim()}`;
    env.AUTH_ORIGINS = browserUrl;
    await compose('up', '-d', '--wait', '--wait-timeout', '180', 'api');
    const result = await exec(
      'pnpm',
      [
        '--filter',
        '@finora/web',
        'exec',
        'playwright',
        'test',
        'auth.compose.spec.ts',
        'finance.compose.spec.ts',
      ],
      {
        env: { ...browserEnv, FINORA_COMPOSE_URL: browserUrl },
        maxBuffer: 16 * 1024 * 1024,
        timeout: 300000,
      },
    );
    console.log(result.stdout);
    // Независимый Stage 6 suite получает свежий auth limiter; production policy не меняется.
    await compose('restart', 'api');
    await compose('up', '-d', '--wait', '--wait-timeout', '180');
    const budgets = await exec(
      'pnpm',
      [
        '--filter',
        '@finora/web',
        'exec',
        'playwright',
        'test',
        'budgets.compose.spec.ts',
      ],
      {
        env: { ...browserEnv, FINORA_COMPOSE_URL: browserUrl },
        maxBuffer: 16 * 1024 * 1024,
        timeout: 300000,
      },
    );
    console.log(budgets.stdout);
    const regression = await exec('node', ['scripts/check-stage6-e2e.mjs'], {
      env: { ...browserEnv, FINORA_COMPOSE_URL: browserUrl },
      maxBuffer: 16 * 1024 * 1024,
      timeout: 300000,
    });
    console.log(regression.stdout);
  }
  console.log(
    `PASS: clean/repeated startup, seed ×3, DB outage/recovery; dataset SHA-256 ${before}`,
  );
} catch (error) {
  if (error.stdout) console.error(error.stdout);
  if (error.stderr) console.error(error.stderr);
  console.error(
    await compose('logs', '--no-color').catch(() => 'Логи недоступны'),
  );
  throw error;
} finally {
  if (browserOutput)
    await rm(join(browserOutput, 'budgets-auth'), {
      recursive: true,
      force: true,
    });
  await compose('down', '-v', '--remove-orphans');
  await rm(checkout, { recursive: true, force: true });
  console.log('Acceptance environment остановлен, его volume удалён');
}
