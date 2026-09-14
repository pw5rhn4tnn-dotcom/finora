import { type Page } from '@playwright/test';
import { test, expect } from './compose-session';
import { z } from 'zod';
import AxeBuilder from '@axe-core/playwright';
const categoryName = (unique: string) =>
  'КатегорияДляПроверкиДлинногоНазвания'.repeat(3).slice(0, 87) + unique;
const description = (unique: string) =>
  'ДлинноеОписаниеОперацииДляПроверкиПереносов'.repeat(13).slice(0, 477) +
  unique;
async function login(page: Page, family = false) {
  await page.goto('/login');
  await page
    .getByLabel('Email', { exact: true })
    .fill(family ? 'family@finora.example' : 'personal@finora.example');
  await page
    .getByLabel('Пароль', { exact: true })
    .fill(family ? 'Finora-Family-2026!' : 'Finora-Personal-2026!');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Обзор', exact: true }),
  ).toBeVisible();
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
async function noOverflow(page: Page) {
  const layout = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    overflowing: [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((element) => element.getBoundingClientRect().right > innerWidth)
      .slice(0, 12)
      .map((element) => ({
        tag: element.tagName,
        className: element.className,
        right: element.getBoundingClientRect().right,
      })),
  }));
  expect(layout.scroll <= layout.width, JSON.stringify(layout)).toBe(true);
}
test('Stage 5: login → category CRUD → transaction CRUD → reload → logout/login → isolation', async ({
  page,
  unique,
}) => {
  const longName = categoryName(unique);
  const longDescription = description(unique);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page);
  await page.goto('/transactions');
  await expect(page.getByRole('table', { name: 'Операции' })).toBeVisible();
  await page.goto('/categories');
  await page.getByRole('button', { name: 'Добавить категорию' }).click();
  let dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Название', { exact: true })
    .fill(`Категория Stage 5 ${unique}`);
  await dialog.getByLabel('Иконка').selectOption('wallet');
  await dialog.getByRole('button', { name: 'Сохранить категорию' }).click();
  await expect(dialog).toBeHidden();
  let card = page
    .locator('.category-card')
    .filter({ hasText: `Категория Stage 5 ${unique}` });
  await card.getByRole('button', { name: 'Изменить' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название', { exact: true }).fill(longName);
  await dialog.getByRole('button', { name: 'Сохранить категорию' }).click();
  await expect(dialog).toBeHidden();
  await page.goto('/transactions');
  await page
    .getByRole('button', { name: 'Добавить операцию', exact: true })
    .click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Сумма', { exact: true }).fill('12,99');
  await dialog
    .getByLabel('Категория', { exact: true })
    .selectOption({ label: longName });
  await dialog.getByLabel('Описание').fill(`Операция Stage 5 ${unique}`);
  await dialog.getByLabel('Валюта', { exact: true }).selectOption('USD');
  await dialog.getByLabel('Курс к RUB').fill('91.375');
  await dialog.getByLabel('Дата', { exact: true }).fill('2026-09-14');
  const created = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      new URL(r.url()).pathname === '/api/v1/transactions',
  );
  await dialog.getByRole('button', { name: 'Сохранить операцию' }).click();
  const createResponse = await created;
  expect(createResponse.status()).toBe(201);
  const transactionId = z
    .object({ id: z.string().uuid() })
    .parse(await createResponse.json()).id;
  await expect(dialog).toBeHidden();
  await page
    .getByLabel('Поиск', { exact: true })
    .fill(`Операция Stage 5 ${unique}`);
  let row = page
    .getByRole('row')
    .filter({ hasText: `Операция Stage 5 ${unique}` });
  await expect(row).toBeVisible();
  await expect(row).toContainText('1 186,96 RUB');
  await page.reload();
  row = page.getByRole('row').filter({ hasText: `Операция Stage 5 ${unique}` });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Изменить' }).click();
  dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Описание')
    .fill(`Изменённая операция Stage 5 ${unique}`);
  await dialog.getByLabel('Сумма', { exact: true }).fill('20');
  await dialog.getByRole('button', { name: 'Сохранить операцию' }).click();
  await expect(dialog).toBeHidden();
  await page
    .getByLabel('Поиск', { exact: true })
    .fill(`Изменённая операция Stage 5 ${unique}`);
  row = page
    .getByRole('row')
    .filter({ hasText: `Изменённая операция Stage 5 ${unique}` });
  await expect(row).toContainText('1 827,50 RUB');
  await row.getByRole('button', { name: 'Удалить', exact: true }).click();
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Удалить', exact: true }).click();
  const removed = page.waitForResponse(
    (r) =>
      r.request().method() === 'DELETE' &&
      new URL(r.url()).pathname === `/api/v1/transactions/${transactionId}`,
  );
  await page.getByRole('button', { name: 'Подтвердить удаление' }).click();
  expect((await removed).status()).toBe(204);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(row).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Добавить операцию', exact: true })
    .first()
    .click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Сумма', { exact: true }).fill('9999999999999999.99');
  await dialog
    .getByLabel('Категория', { exact: true })
    .selectOption({ label: longName });
  await dialog.getByLabel('Описание').fill(longDescription);
  await dialog.getByRole('button', { name: 'Сохранить операцию' }).click();
  await expect(dialog).toBeHidden();
  await page.goto('/categories');
  card = page.locator('.category-card').filter({ hasText: longName });
  await card.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('регулярными правилами');
  await page.getByRole('button', { name: 'Подтвердить удаление' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(card).toContainText('В архиве');
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, true);
  await page.goto('/transactions');
  await page
    .getByLabel('Поиск', { exact: true })
    .fill(longDescription.slice(0, 50));
  await expect(
    page.getByText('По выбранным фильтрам ничего не найдено.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  await page.goto(
    '/transactions?sort=amountDesc&search=' +
      encodeURIComponent(longDescription.slice(-50)),
  );
  await expect(page.getByRole('table')).toContainText(longDescription);
  await page.reload();
  await expect(page.getByRole('table')).toContainText(longDescription);
  expect(errors).toEqual([]);
});
for (const [width, height] of [
  [320, 740],
  [390, 844],
  [768, 1024],
  [1440, 960],
  [1920, 1080],
  [640, 320],
] as const) {
  test(`Stage 5 responsive/axe/keyboard ${width}×${height}`, async ({
    page,
    context,
    sessions,
    unique,
    finance,
  }) => {
    const longName = categoryName(unique);
    const longDescription = description(unique);
    const categoryId = await finance.create('categories', {
      name: longName,
      type: 'EXPENSE',
      icon: 'wallet',
      color: '#4F46E5',
    });
    await finance.create('transactions', {
      categoryId,
      amount: '9999999999999999.99',
      type: 'EXPENSE',
      currency: 'RUB',
      transactionDate: '2026-09-14',
      description: longDescription,
    });
    await context.addCookies(sessions.personal.cookies);
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(
      '/transactions?sort=amountDesc&search=' +
        encodeURIComponent(longDescription.slice(-50)),
    );
    await expect(page.getByRole('table')).toContainText(longDescription);
    await noOverflow(page);
    await axe(page);
    if (width < 768) {
      await page.getByRole('button', { name: 'Фильтры', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await noOverflow(page);
      await axe(page);
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('button', { name: 'Фильтры', exact: true }),
      ).toBeFocused();
    }
    const trigger = page.getByRole('button', {
      name: 'Добавить операцию',
      exact: true,
    });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await axe(page);
    await noOverflow(page);
    await dialog.getByRole('button', { name: 'Сохранить операцию' }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByLabel('Сумма', { exact: true })).toBeFocused();
    await axe(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await noOverflow(page);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await noOverflow(page);
    await page.goto('/categories');
    await expect(
      page.locator('.category-card').filter({ hasText: longName }),
    ).toBeVisible();
    await noOverflow(page);
    await axe(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await noOverflow(page);
  });
}

test('Stage 5: DELETE отменяет первый GET нового фильтра со snapshot до удаления', async ({
  page,
  context,
  sessions,
  unique,
  finance,
}, info) => {
  const label = `Изменённая операция Stage 5 ${unique}`;
  const categoryId = await finance.create('categories', {
    name: `Race ${unique}`,
    type: 'EXPENSE',
    icon: 'wallet',
    color: '#4F46E5',
  });
  const id = await finance.create('transactions', {
    categoryId,
    amount: '20',
    currency: 'RUB',
    type: 'EXPENSE',
    transactionDate: '2026-09-14',
    description: label,
  });
  await context.addCookies(sessions.personal.cookies);
  await page.goto('/transactions');
  const row = page.getByRole('row').filter({ hasText: label });
  await expect(row).toHaveCount(1);
  await page.clock.install();
  let captured!: () => void;
  let deliver!: () => void;
  const snapshotReady = new Promise<void>((resolve) => {
    captured = resolve;
  });
  const delivery = new Promise<void>((resolve) => {
    deliver = resolve;
  });
  let searches = 0;
  await page.route('**/api/v1/transactions?*', async (route) => {
    if (
      new URL(route.request().url()).searchParams.get('search') === label &&
      ++searches === 1
    ) {
      const snapshot = await route.fetch();
      expect(snapshot.status()).toBe(200);
      expect(
        z
          .object({ items: z.array(z.object({ id: z.string().uuid() })) })
          .parse(await snapshot.json())
          .items.map((item) => item.id),
      ).toEqual([id]);
      captured();
      await delivery;
      await route.fulfill({ response: snapshot });
    } else await route.continue();
  });
  try {
    await page.getByLabel('Поиск', { exact: true }).fill(label);
    await row.getByRole('button', { name: 'Удалить', exact: true }).click();
    // Управляем именно debounce приложения, не ждём произвольное время сети.
    await page.clock.runFor(300);
    await snapshotReady;
    const response = page.waitForResponse(
      (r) =>
        r.request().method() === 'DELETE' &&
        new URL(r.url()).pathname === `/api/v1/transactions/${id}`,
    );
    await page.getByRole('button', { name: 'Подтвердить удаление' }).click();
    const deleted = await response;
    expect(deleted.status()).toBe(204);
    expect(
      (await page.request.get(`/api/v1/transactions/${id}`)).status(),
    ).toBe(404);
    deliver();
    await page.clock.resume();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(row).toHaveCount(0);
    expect(searches).toBe(2);
    await info.attach('DELETE lifecycle', {
      body: JSON.stringify({
        id,
        url: deleted.url(),
        status: deleted.status(),
        searches,
      }),
      contentType: 'application/json',
    });
  } finally {
    deliver();
    await page.clock.resume();
  }
});
