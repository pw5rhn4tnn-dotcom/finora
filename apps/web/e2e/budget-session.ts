import {
  test as base,
  expect,
  type BrowserContext,
  type Page,
  type TestInfo,
} from '@playwright/test';
import { join } from 'node:path';

export function budgetSessionPath(
  testInfo: TestInfo,
  profile: 'personal' | 'family',
) {
  const setup = testInfo.config.projects.find(
    (project) => project.name === 'budgets-auth',
  );
  if (!setup) throw new Error('Не настроен setup project budgets-auth');
  return join(setup.outputDir, `${profile}.json`);
}

export async function login(page: Page, other = false) {
  await page.goto('/login');
  await page
    .getByLabel('Email', { exact: true })
    .fill(other ? 'family@finora.example' : 'personal@finora.example');
  await page
    .getByLabel('Пароль', { exact: true })
    .fill(other ? 'Finora-Family-2026!' : 'Finora-Personal-2026!');
  const response = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/v1/auth/login') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  expect((await response).status(), 'Вход должен завершиться HTTP 200').toBe(
    200,
  );
  await expect(
    page.getByRole('heading', { name: 'Обзор', exact: true }),
  ).toBeVisible();
}

// Каждый тест получает новый context/page и копию неизменяемой сессии setup.
// Перезапуск worker после failed test не вызывает новые login-запросы.
export const test = base.extend<{ family: BrowserContext }>({
  storageState: async ({ baseURL }, use, testInfo) => {
    if (!baseURL) throw new Error('Для budget acceptance нужен baseURL');
    await use(budgetSessionPath(testInfo, 'personal'));
  },
  family: async ({ browser, baseURL }, use, testInfo) => {
    const context = await browser.newContext({
      baseURL,
      storageState: budgetSessionPath(testInfo, 'family'),
    });
    try {
      await use(context);
    } finally {
      await context.close();
    }
  },
});
