import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
const exec = promisify(execFile);
const origin = process.env.FINORA_COMPOSE_URL;
const project = process.env.FINORA_STRESS_COMPOSE_PROJECT;
const directory = process.env.FINORA_STRESS_COMPOSE_DIR;
const container = process.env.FINORA_STRESS_BROWSER_CONTAINER;
if (!origin || !project || !directory)
  throw new Error(
    'Требуются FINORA_COMPOSE_URL, FINORA_STRESS_COMPOSE_PROJECT и FINORA_STRESS_COMPOSE_DIR отдельного disposable Compose: runner перезапускает его API между login-сценариями.',
  );
const root = resolve('apps/web/test-results');
await mkdir(root, { recursive: true });
const output = container
  ? (
      await exec('docker', [
        'exec',
        container,
        'node',
        '-e',
        "console.log(require('node:fs').mkdtempSync(require('node:path').join(require('node:os').tmpdir(),'finora-dashboard-stress-')))",
      ])
    ).stdout.trim()
  : await mkdtemp(join(root, 'dashboard-stress-'));
console.log(
  `Stage 7 stress artifacts: ${container ? `${container}:` : ''}${output}`,
);
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
    const r = container
      ? await exec(
          'docker',
          [
            'exec',
            '-e',
            `FINORA_COMPOSE_URL=${origin}`,
            '-e',
            `FINORA_PLAYWRIGHT_OUTPUT_DIR=${output}`,
            container,
            'pnpm',
            ...command,
          ],
          { timeout: 300000, maxBuffer: 16 * 1024 * 1024 },
        )
      : await exec('pnpm', command, {
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
  await browser(['--project=budgets-auth', '--workers=1', '--retries=0']);
  for (let runNumber = 1; runNumber <= 20; runNumber++) {
    await resetApi();
    const workers = [1, 2, 4][(runNumber - 1) % 3];
    console.log(
      `Stage 7 stress ${runNumber}/20: workers=${workers}, repeat-each=2, retries=0`,
    );
    await browser([
      'dashboard.compose.spec.ts',
      '--project=dashboard',
      '--no-deps',
      '--grep=critical:',
      `--workers=${workers}`,
      '--repeat-each=2',
      '--retries=0',
    ]);
  }
  console.log(
    'PASS Stage 7: 20 последовательных запусков, 120 critical cases, workers=1/2/4, retries=0; month ordering, create/reload, logout/login, two owners, navigation and resize',
  );
} finally {
  if (container)
    await exec('docker', [
      'exec',
      container,
      'node',
      '-e',
      "require('node:fs').rmSync(require('node:path').join(process.argv[1],'budgets-auth'),{recursive:true,force:true})",
      output,
    ]);
  else await rm(join(output, 'budgets-auth'), { recursive: true, force: true });
}
