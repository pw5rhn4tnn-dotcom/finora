import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
const exec = promisify(execFile);
const origin = process.env.FINORA_COMPOSE_URL;
const project = process.env.FINORA_STRESS_COMPOSE_PROJECT;
const directory = process.env.FINORA_STRESS_COMPOSE_DIR;
if (!origin || !project || !directory)
  throw new Error(
    'Требуются FINORA_COMPOSE_URL, FINORA_STRESS_COMPOSE_PROJECT и FINORA_STRESS_COMPOSE_DIR отдельного disposable Compose: runner перезапускает его API между запусками.',
  );
const root = resolve('apps/web/test-results');
await mkdir(root, { recursive: true });
const output = await mkdtemp(join(root, 'csv-import-stress-'));
console.log(`Stage 9 stress artifacts: ${output}`);
async function browser(args) {
  const command = [
    '--filter',
    '@finora/web',
    'exec',
    'playwright',
    'test',
    ...args,
  ];
  try {
    const r = await exec('pnpm', command, {
      env: { ...process.env, FINORA_PLAYWRIGHT_OUTPUT_DIR: output },
      timeout: 300000,
      maxBuffer: 16 * 1024 * 1024,
    });
    console.log(r.stdout);
  } catch (error) {
    console.error(error.stdout);
    console.error(error.stderr);
    throw error;
  }
}
async function resetApi() {
  await exec('docker', ['compose', '-p', project, 'restart', 'api'], {
    cwd: directory,
    timeout: 60000,
  });
  const id = (
    await exec('docker', ['compose', '-p', project, 'ps', '-q', 'api'], {
      cwd: directory,
    })
  ).stdout.trim();
  if (!id) throw new Error('API container не найден');
  const until = Date.now() + 60000;
  while (Date.now() < until) {
    const state = (
      await exec('docker', [
        'inspect',
        '--format',
        '{{.State.Health.Status}}',
        id,
      ])
    ).stdout.trim();
    if (state === 'healthy') return;
    await setTimeout(250);
  }
  throw new Error('API не стал healthy после restart');
}
try {
  await resetApi();
  await browser(['--project=compose-auth', '--workers=1', '--retries=0']);
  for (let runNumber = 1; runNumber <= 20; runNumber++) {
    await resetApi();
    const workers = [1, 2, 4][(runNumber - 1) % 3];
    console.log(
      `Stage 9 stress ${runNumber}/20: workers=${workers}, retries=0`,
    );
    await browser([
      'csv-import.compose.spec.ts',
      '--project=chromium',
      '--no-deps',
      `--workers=${workers}`,
      '--retries=0',
    ]);
  }
  console.log(
    'PASS Stage 9: 20 последовательных запусков, 80 test cases (upload/mapping/review/import, повторный импорт/дубли, экспорт, мобильный wizard), workers=1/2/4, retries=0',
  );
} finally {
  await rm(join(output, 'compose-auth'), { recursive: true, force: true });
}
