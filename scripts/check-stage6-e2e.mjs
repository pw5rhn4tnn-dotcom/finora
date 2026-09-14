import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
assert.ok(
  process.env.FINORA_COMPOSE_URL,
  'Нужен URL отдельного Compose acceptance',
);
const web = resolve(dirname(fileURLToPath(import.meta.url)), '../apps/web');
const checkout = await mkdtemp(join(tmpdir(), 'finora-stage6-regression-'));
const marker = 'STAGE6_EXPECTED_WORKER_FAILURE';
try {
  await mkdir(join(checkout, 'e2e'));
  await copyFile(join(web, 'package.json'), join(checkout, 'package.json'));
  await symlink(
    join(web, 'node_modules'),
    join(checkout, 'node_modules'),
    'dir',
  );
  await copyFile(
    join(web, 'playwright.config.ts'),
    join(checkout, 'playwright.config.ts'),
  );
  for (const file of ['budget-session.ts', 'budgets.setup.ts']) {
    await copyFile(join(web, 'e2e', file), join(checkout, 'e2e', file));
  }
  const original = await readFile(
    join(web, 'e2e/budgets.compose.spec.ts'),
    'utf8',
  );
  const probes = `
for (let index = 0; index < 5; index++) {
  test('Stage 6 isolation-probe ' + index, async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Обзор', exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('stage6-pollution'))).toBeNull();
    await page.evaluate(() => {
      localStorage.setItem('stage6-pollution', 'dirty');
      document.documentElement.style.fontSize = '200%';
    });
    await context.clearCookies();
    await page.route('**/api/v1/**', route => route.abort());
    throw new Error('${marker}');
  });
}
`;
  for (const fault of [true, false]) {
    const output = join(checkout, fault ? 'after-failures' : 'parallel-repeat');
    const reportFile = join(
      checkout,
      fault ? 'failures.json' : 'parallel.json',
    );
    await writeFile(
      join(checkout, 'e2e/budgets.compose.spec.ts'),
      fault
        ? original.replace(
            'for (const [index,',
            probes + '\nfor (const [index,',
          )
        : original,
    );
    const args = [
      '--filter',
      '@finora/web',
      'exec',
      'playwright',
      'test',
      'budgets.compose.spec.ts',
      '--config',
      join(checkout, 'playwright.config.ts'),
      '--grep',
      'Stage 6 (responsive/a11y|isolation-probe)',
      '--reporter=json',
      fault ? '--workers=1' : '--workers=4',
    ];
    if (!fault) args.push('--repeat-each=2');
    let exitCode = 0;
    let childError;
    try {
      await exec('pnpm', args, {
        env: {
          ...process.env,
          FINORA_PLAYWRIGHT_OUTPUT_DIR: output,
          PLAYWRIGHT_JSON_OUTPUT_FILE: reportFile,
        },
        maxBuffer: 16 * 1024 * 1024,
        timeout: 300000,
      });
    } catch (error) {
      if (!fault || error.code !== 1) throw error;
      exitCode = error.code;
      childError = error;
    }
    assert.equal(exitCode, fault ? 1 : 0);
    const report = JSON.parse(
      await readFile(reportFile, 'utf8').catch((error) => {
        throw childError ?? error;
      }),
    );
    assert.deepEqual(report.errors, []);
    const specs = [];
    function collect(suites) {
      for (const suite of suites) {
        specs.push(...suite.specs);
        collect(suite.suites ?? []);
      }
    }
    collect(report.suites);
    let failures = 0;
    let viewports = 0;
    const artifacts = new Set();
    for (const spec of specs) {
      for (const test of spec.tests) {
        assert.equal(test.results.length, 1, 'Никаких retries');
        const result = test.results[0];
        if (spec.title.includes('isolation-probe')) {
          assert.equal(result.status, 'failed');
          assert.ok(
            result.errors.every((error) => error.message.includes(marker)),
          );
          assert.ok(result.errors.length > 0);
          failures++;
          continue;
        }
        assert.equal(
          result.status,
          'passed',
          `${spec.title}\n${JSON.stringify(result.errors)}`,
        );
        if (!spec.title.includes('responsive/a11y')) continue;
        viewports++;
        const screenshots = result.attachments.filter((item) =>
          ['Обычный размер текста', 'Текст 200%'].includes(item.name),
        );
        assert.equal(screenshots.length, 2, spec.title);
        for (const item of screenshots) {
          assert.ok(!relative(output, item.path).startsWith('..'), item.path);
          assert.ok(
            !artifacts.has(item.path),
            'Screenshot другого теста перезаписан',
          );
          artifacts.add(item.path);
          const png = await readFile(item.path);
          assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        }
      }
    }
    assert.equal(failures, fault ? 5 : 0);
    assert.equal(viewports, fault ? 6 : 12);
    console.log(
      `PASS Stage 6 regression: ${failures} ожидаемых перезапусков worker, ${viewports} viewport scenarios, ${artifacts.size} отдельных PNG в заданном outputDir`,
    );
  }
} finally {
  await rm(checkout, { recursive: true, force: true });
}
