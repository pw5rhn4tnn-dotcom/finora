import { dashboardFixture } from '../src/test/dashboard-fixture';
import { testUser, testOptions } from '../src/test/fixtures';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Изолированные регрессии Stage 3 получают авторизованную сессию.
// Реальные cookie/Nginx/DB сценарии находятся в auth.compose.spec.ts.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/dashboard?*', (route) => {
    const q = new URL(route.request().url()).searchParams;
    return route.fulfill({
      json: dashboardFixture(Number(q.get('year')), Number(q.get('month'))),
    });
  });
  await page.route('**/api/v1/budgets?*', (route) =>
    route.fulfill({ json: { items: [], page: 1, pageSize: 25, total: 0 } }),
  );
  await page.route('**/api/v1/transactions?*', (route) =>
    route.fulfill({ json: { items: [], page: 1, pageSize: 25, total: 0 } }),
  );
  await page.route('**/api/v1/recurring-transactions?*', (route) =>
    route.fulfill({ json: { items: [], page: 1, pageSize: 25, total: 0 } }),
  );
  await page.route('**/api/v1/categories/options', (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route('**/api/v1/settings/options', (route) =>
    route.fulfill({ json: testOptions }),
  );
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ json: testUser }),
  );
});

for (const [width, height] of [
  [320, 740],
  [390, 844],
  [767, 900],
  [640, 320],
  [768, 1024],
  [1024, 768],
  [1440, 960],
  [1920, 1080],
] as const) {
  test(`shell и компоненты без overflow при ${width}×${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Обзор', exact: true }),
    ).toBeVisible();
    const mobile = width < 768;
    await expect(
      page.getByRole('navigation', { name: 'Мобильная навигация' }),
    ).toBeVisible({ visible: mobile });
    await expect(
      page.getByRole('navigation', { name: 'Основная навигация' }),
    ).toBeVisible({ visible: !mobile });
    for (const route of [
      '/',
      '/recurring',
      '/transactions/import',
      '/design-system',
    ]) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const controls = await page
        .locator('nav a, nav button')
        .evaluateAll((elements) =>
          elements
            .filter((e) => e.getBoundingClientRect().width > 0)
            .map((e) => ({
              width: e.getBoundingClientRect().width,
              height: e.getBoundingClientRect().height,
              clipped: e.scrollWidth > e.clientWidth,
            })),
        );
      expect(
        controls.every((c) => c.width >= 44 && c.height >= 44 && !c.clipped),
      ).toBe(true);
    }
    if (mobile) {
      await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
      const footer = await page.getByRole('contentinfo').boundingBox();
      const nav = await page
        .getByRole('navigation', { name: 'Мобильная навигация' })
        .boundingBox();
      // Допуск 1 CSS px на дробную геометрию и округление scroll position.
      expect(footer!.y + footer!.height).toBeLessThanOrEqual(nav!.y + 1);
    }
  });
}

test('mobile Ещё: focus trap, Escape, navigation, browser back', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const more = page.getByRole('button', { name: 'Ещё', exact: true });
  await more.click();
  const dialog = page.getByRole('dialog', { name: 'Ещё', exact: true });
  const close = dialog.getByRole('button', { name: 'Закрыть панель' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('link', { name: 'Настройки' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(more).toBeFocused();
  await more.click();
  await dialog.getByRole('link', { name: 'Регулярные операции' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('main')).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'Ещё — текущий раздел' }),
  ).toHaveClass(/active/);
  await page.goBack();
  await expect(
    page.getByRole('heading', { name: 'Обзор', exact: true }),
  ).toBeVisible();
});

test('desktop skip link, focus ring и навигация клавиатурой', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Перейти к содержимому' });
  await expect(skip).toBeFocused();
  expect(await skip.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe(
    'solid',
  );
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  const budgets = page
    .getByRole('navigation', { name: 'Основная навигация' })
    .getByRole('link', { name: 'Бюджеты' });
  await budgets.focus();
  await page.keyboard.press('Enter');
  await expect(budgets).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveTitle('Бюджеты — Finora');
});

for (const width of [390, 1440]) {
  test(`WCAG 2.2 AA: shell, states, поля и открытый dialog при ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    for (const route of ['/', '/transactions', '/design-system']) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(result.violations).toEqual([]);
    }
    await page.getByRole('button', { name: 'Открыть пример панели' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
  });
}

test('reduced motion, длинный текст и увеличенный шрифт', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/design-system');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(
    await page
      .locator('.skeleton')
      .first()
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe('none');
  await page
    .getByRole('textbox', { name: 'Поиск', exact: true })
    .fill('Очень длинное название для проверки поля '.repeat(8));
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
    const value = document.querySelector('.numeric');
    if (value) value.textContent = '123456789012345678901234567890,00 ₽';
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Открыть пример панели' }).click();
  expect(
    await page
      .getByRole('dialog')
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe('none');
  await page.getByRole('textbox', { name: 'Название примера' }).fill('Тест');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('hover, disabled и native поле работают в браузере', async ({ page }) => {
  await page.goto('/design-system');
  const button = page.getByRole('button', {
    name: 'Основное действие',
    exact: true,
  });
  const initial = await button.evaluate(
    (e) => getComputedStyle(e).backgroundColor,
  );
  await button.hover();
  await expect
    .poll(() => button.evaluate((e) => getComputedStyle(e).backgroundColor))
    .not.toBe(initial);
  await button.click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Основное действие выполнено' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Недоступно', exact: true }),
  ).toBeDisabled();
  await page.getByLabel('Состояние', { exact: true }).selectOption('ready');
  await expect(page.getByLabel('Состояние', { exact: true })).toHaveValue(
    'ready',
  );
});

test('клавиатурный focus нижнего действия не скрывается за bottom navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/design-system');
  await page.getByRole('heading', { level: 1 }).waitFor();
  const retry = page.getByRole('button', { name: 'Повторить', exact: true });
  await retry.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(retry).toBeFocused();
  const button = await retry.boundingBox();
  const nav = await page
    .getByRole('navigation', { name: 'Мобильная навигация' })
    .boundingBox();
  expect(button!.y + button!.height).toBeLessThanOrEqual(nav!.y);
});
