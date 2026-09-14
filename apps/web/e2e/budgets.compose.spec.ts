import {
  test,
  expect,
  type Page,
  type BrowserContext,
  type APIRequestContext,
} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
test.describe.configure({ mode: 'default' });
const object = z.record(z.string(), z.unknown());
let cookies: Awaited<ReturnType<BrowserContext['cookies']>> = [];
let family: BrowserContext;
const period = '2028-02';
const longName = 'КатегорияДляМесячногоПланирования'.repeat(4).slice(0, 90);
async function login(page: Page, other = false) {
  await page.goto('/login');
  await page
    .getByLabel('Email', { exact: true })
    .fill(other ? 'family@finora.example' : 'personal@finora.example');
  await page
    .getByLabel('Пароль', { exact: true })
    .fill(other ? 'Finora-Family-2026!' : 'Finora-Personal-2026!');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Обзор', exact: true }),
  ).toBeVisible();
}
test.beforeAll(async ({ browser, baseURL }) => {
  const personal = await browser.newContext({ baseURL });
  try {
    await login(await personal.newPage());
    cookies = await personal.cookies();
  } finally {
    await personal.close();
  }
  family = await browser.newContext({ baseURL });
  await login(await family.newPage(), true);
});
test.afterAll(async () => {
  await family.close();
});
test.beforeEach(async ({ context }) => {
  await context.addCookies(cookies);
});
async function api(
  request: APIRequestContext,
  path: string,
  method = 'GET',
  data?: unknown,
) {
  const r = await request.fetch(`/api/v1${path}`, {
    method,
    data,
    headers: { Origin: process.env.FINORA_COMPOSE_URL! },
  });
  return r;
}
async function category(
  request: APIRequestContext,
  name = `Бюджет ${randomUUID()}`,
) {
  const r = await api(request, '/categories', 'POST', {
    name,
    type: 'EXPENSE',
    icon: 'wallet',
    color: '#4338A3',
  });
  expect(r.status()).toBe(201);
  const row = object.parse(await r.json());
  return z.string().parse(row.id);
}
async function createBudget(
  request: APIRequestContext,
  categoryId: string,
  limitAmount = '100',
) {
  const r = await api(request, '/budgets', 'POST', {
    categoryId,
    year: 2028,
    month: 2,
    limitAmount,
  });
  expect(r.status()).toBe(201);
  return object.parse(await r.json());
}
async function spending(
  request: APIRequestContext,
  categoryId: string,
  amount: string,
  transactionDate = '2028-02-29',
) {
  const r = await api(request, '/transactions', 'POST', {
    categoryId,
    amount,
    currency: 'RUB',
    type: 'EXPENSE',
    transactionDate,
    description: 'Budget E2E',
  });
  expect(r.status()).toBe(201);
  return object.parse(await r.json());
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.locator('.topbar').evaluate((header) => {
      const bottom = header.getBoundingClientRect().bottom;
      return [...header.children].every((child) => {
        const rect = child.getBoundingClientRect();
        return (
          rect.width === 0 || rect.height === 0 || rect.bottom <= bottom + 1
        );
      });
    }),
  ).toBe(true);
}
async function axe(page: Page) {
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
}
test('Stage 6 UI: login → create budget → transaction → actual → edit → delete', async ({
  page,
  context,
}) => {
  await context.clearCookies();
  await login(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const name = `Планирование ${randomUUID()}`;
  await category(context.request, name);
  await page.goto(`/budgets?period=${period}`);
  await page.getByRole('button', { name: 'Добавить бюджет' }).first().click();
  let dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Категория', { exact: true })
    .selectOption({ label: name });
  await dialog.getByLabel('Лимит, RUB').fill('100');
  await dialog.getByRole('button', { name: 'Сохранить бюджет' }).click();
  await expect(dialog).toBeHidden();
  let card = page.locator('.budget-card').filter({ hasText: name });
  await expect(card).toContainText('Осталось 100,00 RUB');
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'Добавить операцию' }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Сумма', { exact: true }).fill('125');
  await dialog
    .getByLabel('Категория', { exact: true })
    .selectOption({ label: name });
  await dialog.getByLabel('Дата', { exact: true }).fill('2028-02-29');
  await dialog.getByLabel('Описание').fill('Расход для бюджета');
  await dialog.getByRole('button', { name: 'Сохранить операцию' }).click();
  await expect(dialog).toBeHidden();
  await page.goto(`/budgets?period=${period}`);
  card = page.locator('.budget-card').filter({ hasText: name });
  await expect(card).toContainText('Превышение на 25,00 RUB');
  await expect(card.getByRole('progressbar')).toHaveAttribute(
    'aria-valuetext',
    /125,00%/,
  );
  await card.getByRole('button', { name: 'Изменить' }).click();
  await page.getByLabel('Лимит, RUB').fill('125');
  await page.getByRole('button', { name: 'Сохранить бюджет' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(card).toContainText('Лимит исчерпан');
  await card.getByRole('button', { name: 'Удалить' }).click();
  await page.getByRole('button', { name: 'Подтвердить удаление' }).click();
  await expect(card).toHaveCount(0);
  await expect(page.getByText('Бюджет удалён.', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('Stage 6 isolation: seed User B GET/PATCH/DELETE и чужой расход не влияют на User A', async ({
  page,
  context,
}) => {
  const foreign = await api(family.request, '/budgets?year=2026&month=9');
  expect(foreign.status()).toBe(200);
  const foreignRows = z
    .array(object)
    .parse(object.parse(await foreign.json()).items);
  const own = await api(context.request, '/budgets?year=2026&month=9');
  const ownRows = z.array(object).parse(object.parse(await own.json()).items);
  expect(ownRows.some((a) => foreignRows.some((b) => b.id === a.id))).toBe(
    false,
  );
  for (const method of ['GET', 'PATCH', 'DELETE'])
    expect(
      (
        await api(
          context.request,
          `/budgets/${z.string().parse(foreignRows[0]!.id)}`,
          method,
          method === 'PATCH' ? { limitAmount: '1' } : undefined,
        )
      ).status(),
    ).toBe(404);
  const name = `Изоляция ${randomUUID()}`;
  const a = await category(context.request, name),
    b = await category(family.request, name);
  await createBudget(context.request, a);
  await createBudget(family.request, b);
  await spending(context.request, a, '0.1');
  await spending(context.request, a, '0.2');
  await spending(family.request, b, '999999');
  await page.goto(`/budgets?period=${period}`);
  const card = page.locator('.budget-card').filter({ hasText: name });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('0,30 RUB');
  await expect(card).toContainText('Осталось 99,70 RUB');
  expect(
    (
      await api(context.request, '/budgets', 'POST', {
        categoryId: b,
        year: 2028,
        month: 3,
        limitAmount: '5',
      })
    ).status(),
  ).toBe(400);
});
test('Stage 6 browser errors: list retry, duplicate, draft preservation, double-submit pending', async ({
  page,
  context,
}) => {
  const name = `Ошибки ${randomUUID()}`;
  const id = await category(context.request, name);
  await createBudget(context.request, id);
  await page.route('**/api/v1/budgets?*', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/problem+json',
      json: { status: 503, detail: 'Бюджеты временно недоступны', errors: {} },
    }),
  );
  await page.goto(`/budgets?period=${period}`);
  await expect(page.getByRole('alert')).toContainText(
    'Бюджеты временно недоступны',
  );
  await page.unroute('**/api/v1/budgets?*');
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(
    page.locator('.budget-card').filter({ hasText: name }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Добавить бюджет' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Категория', { exact: true }).selectOption(id);
  await dialog.getByLabel('Лимит, RUB').fill('57,25');
  await dialog.getByRole('button', { name: 'Сохранить бюджет' }).click();
  await expect(dialog.getByRole('alert')).toContainText('уже существует');
  await expect(dialog.getByLabel('Лимит, RUB')).toHaveValue('57,25');
  await dialog.getByLabel('Месяц бюджета').selectOption('3');
  let writes = 0;
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/budgets', async (route) => {
    writes++;
    await held;
    await route.continue();
  });
  try {
    await dialog.getByRole('button', { name: 'Сохранить бюджет' }).dblclick();
    await expect(
      dialog.getByRole('button', { name: 'Сохраняем…' }),
    ).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    expect(writes).toBe(1);
  } finally {
    release();
  }
  await expect(dialog).toBeHidden();
});
for (const [width, height] of [
  [320, 740],
  [390, 844],
  [640, 320],
  [768, 1024],
  [1440, 960],
  [1920, 1080],
] as const) {
  test(`Stage 6 responsive/a11y ${width}×${height}, длинное имя, большие суммы, Sheet, 200% text`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const name = `${longName.slice(0, 80)}${width}${randomUUID().slice(0, 8)}`;
    const id = await category(context.request, name);
    await createBudget(context.request, id, '9999999999999999.99');
    await spending(context.request, id, '9999999999999999.98');
    await page.goto(`/budgets?period=${period}&pageSize=50`);
    const card = page.locator('.budget-card').filter({ hasText: name });
    await expect(card).toContainText('Осталось 0,01 RUB');
    await noOverflow(page);
    await axe(page);
    await page.screenshot({
      path: `/private/tmp/finora-stage6-${width}-normal.png`,
      fullPage: true,
    });
    await card.getByRole('button', { name: 'Изменить' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Категория', { exact: true })).toHaveValue(
      id,
    );
    await expect(dialog.getByLabel('Лимит, RUB')).toHaveValue(
      '9999999999999999.99',
    );
    await noOverflow(page);
    await axe(page);
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await noOverflow(page);
    await dialog
      .getByRole('button', { name: 'Сохранить бюджет' })
      .scrollIntoViewIfNeeded();
    await expect(
      dialog.getByRole('button', { name: 'Сохранить бюджет' }),
    ).toBeInViewport();
    await page.keyboard.press('Escape');
    await noOverflow(page);
    await expect(card.getByRole('button', { name: 'Изменить' })).toBeFocused();
    await page.screenshot({
      path: `/private/tmp/finora-stage6-${width}.png`,
      fullPage: true,
    });
  });
}
test('Stage 6 keyboard-only: focus, validation, trap, Escape, confirmation и empty state', async ({
  page,
}) => {
  await page.goto('/budgets?period=2001-01');
  await expect(
    page.getByRole('heading', { name: 'На этот месяц бюджетов нет' }),
  ).toBeVisible();
  const add = page.getByRole('button', { name: 'Добавить бюджет' }).first();
  await add.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  const close = dialog.getByRole('button', { name: 'Закрыть панель' });
  await expect(close).toBeFocused();
  await expect(
    dialog.getByRole('button', { name: 'Сохранить бюджет' }),
  ).toBeEnabled();
  await page.keyboard.press('Shift+Tab');
  await expect(
    dialog.getByRole('button', { name: 'Сохранить бюджет' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(dialog.getByLabel('Категория', { exact: true })).toBeFocused();
  await expect(dialog.getByLabel('Категория', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await axe(page);
  await page.keyboard.press('Escape');
  await expect(add).toBeFocused();
});
test('Stage 6 keyboard confirmation: Escape/cancel, удаление и возврат focus после исчезновения строки', async ({
  page,
  context,
}) => {
  const name = `Подтверждение ${randomUUID()}`;
  const id = await category(context.request, name);
  await createBudget(context.request, id);
  await page.goto(`/budgets?period=${period}&pageSize=50`);
  const card = page.locator('.budget-card').filter({ hasText: name });
  const remove = card.getByRole('button', { name: 'Удалить' });
  await remove.focus();
  await page.keyboard.press('Enter');
  let dialog = page.getByRole('dialog', { name: 'Удалить бюджет?' });
  await expect(
    dialog.getByRole('button', { name: 'Закрыть панель' }),
  ).toBeFocused();
  await axe(page);
  await page.keyboard.press('Escape');
  await expect(remove).toBeFocused();
  await page.keyboard.press('Enter');
  dialog = page.getByRole('dialog');
  await page.keyboard.press('Shift+Tab');
  await expect(
    dialog.getByRole('button', { name: 'Подтвердить удаление' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(card).toHaveCount(0);
  await expect(page.getByRole('main')).toBeFocused();
});
test('Stage 6 historical archive: категория остаётся выбранной после загрузки options, лимит редактируется', async ({
  page,
  context,
}) => {
  const name = `Архив ${randomUUID()}`;
  const id = await category(context.request, name);
  await createBudget(context.request, id);
  expect(
    (await api(context.request, `/categories/${id}`, 'DELETE')).status(),
  ).toBe(200);
  await page.goto(`/budgets?period=${period}&pageSize=50`);
  const card = page.locator('.budget-card').filter({ hasText: name });
  await card.getByRole('button', { name: 'Изменить' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Категория', { exact: true })).toHaveValue(id);
  await dialog.getByLabel('Лимит, RUB').fill('150');
  await dialog.getByRole('button', { name: 'Сохранить бюджет' }).click();
  await expect(dialog).toBeHidden();
  await expect(card).toContainText('Лимит 150,00 RUB');
});
