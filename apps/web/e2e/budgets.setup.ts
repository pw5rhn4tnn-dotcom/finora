import { test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { budgetSessionPath, login } from './budget-session';

test('Stage 6: подготовить независимые сессии двух demo-владельцев', async ({
  browser,
  baseURL,
}, testInfo) => {
  await mkdir(testInfo.project.outputDir, { recursive: true });
  for (const profile of ['personal', 'family'] as const) {
    const context = await browser.newContext({ baseURL });
    try {
      await login(await context.newPage(), profile === 'family');
      await context.storageState({
        path: budgetSessionPath(testInfo, profile),
      });
    } finally {
      await context.close();
    }
  }
});
