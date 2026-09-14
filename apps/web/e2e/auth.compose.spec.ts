import { expect, test, type Page, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Настоящие Nginx, NestJS и PostgreSQL. Моки используются только в явно
// названных проверках сбоя сети/загрузки ниже.
test.describe.configure({ mode: 'serial' });
let registeredCookies: Awaited<ReturnType<BrowserContext['cookies']>> = [];
const password = 'Stage4-strong-password!';
async function login(
  page: Page,
  email = 'personal@finora.example',
  value = 'Finora-Personal-2026!',
) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Пароль', { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Обзор', exact: true }),
  ).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
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
test('регистрация → профиль → reload → logout → login; validation и cookie', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/login$/);
  await page
    .getByRole('link', { name: 'Создать аккаунт', exact: true })
    .click();
  await expect(page.getByLabel('Основная валюта')).toBeVisible();
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await expect(page.getByRole('alert')).toContainText('Проверьте');
  await expect(page.getByLabel('Имя профиля')).toBeFocused();
  await page.getByLabel('Имя профиля').fill('Новый пользователь');
  await page.getByLabel('Email', { exact: true }).fill(' NEW@STAGE4.EXAMPLE ');
  await page.getByLabel('Пароль', { exact: true }).fill(password);
  await page.getByLabel('Основная валюта').selectOption('EUR');
  await page.getByLabel('Часовой пояс').selectOption('UTC');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await expect(
    page.getByRole('heading', { name: 'Обзор', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('main')).toBeFocused();
  const cookie = (await context.cookies()).find(
    (cookie) => cookie.name === 'finora_session',
  );
  expect(cookie).toMatchObject({
    httpOnly: true,
    sameSite: 'Strict',
    secure: false,
    path: '/',
  });
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    'finora_session',
  );
  await page.goto('/settings');
  await expect(
    page.getByText('new@stage4.example', { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Основная валюта')).toBeEnabled();
  await page.getByLabel('Основная валюта').selectOption('USD');
  await page.getByLabel('Часовой пояс').selectOption('Europe/Moscow');
  await page.getByLabel('Имя профиля').fill('Имя'.repeat(33));
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(page.getByRole('status')).toContainText('Настройки сохранены');
  await page.reload();
  await expect(page.getByLabel('Основная валюта')).toHaveValue('USD');
  await expect(page.getByLabel('Часовой пояс')).toHaveValue('Europe/Moscow');
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === 'finora_session',
    ),
  ).toBe(false);
  await login(page, 'new@stage4.example', password);
  await page.goto('/settings');
  await expect(page.getByLabel('Основная валюта')).toHaveValue('USD');
  registeredCookies = await context.cookies();
  expect(errors).toEqual([]);
});
test('demo аккаунты изолированы; семейный профиль не получает настройки личного', async ({
  page,
}) => {
  await page.goto('/login');
  await page
    .getByRole('button', { name: 'Личный профиль', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Обзор', exact: true }),
  ).toBeVisible();
  await page.goto('/settings');
  await expect(
    page.getByText('personal@finora.example', { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Основная валюта')).toBeDisabled();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await page
    .getByRole('button', { name: 'Семейный профиль', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Обзор', exact: true }),
  ).toBeVisible();
  await page.goto('/settings');
  await expect(
    page.getByText('family@finora.example', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('personal@finora.example', { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel('Имя профиля')).toHaveValue(
    'Мария · семейный бюджет',
  );
});
test('неверный пароль, unavailable API, retry и потеря сессии', async ({
  page,
  context,
}) => {
  await page.goto('/login');
  await page
    .getByLabel('Email', { exact: true })
    .fill('personal@finora.example');
  await page.getByLabel('Пароль', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Неверный email или пароль',
  );
  await login(page);
  await page.route('**/api/v1/auth/me', (route) => route.abort());
  await page.goto('/settings');
  await expect(page.getByRole('alert')).toContainText('Нет связи');
  await page.unroute('**/api/v1/auth/me');
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Настройки', exact: true }),
  ).toBeVisible();
  await context.clearCookies();
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByText('personal@finora.example', { exact: true }),
  ).toHaveCount(0);
});
for (const [width, height] of [
  [320, 740],
  [390, 844],
  [768, 1024],
  [1440, 960],
  [1920, 1080],
  [640, 320],
] as const) {
  test(`auth и профиль: responsive, reflow и axe ${width}×${height}`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/login');
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await noOverflow(page);
    await axe(page);
    await page.goto('/register');
    await expect(page.getByLabel('Основная валюта')).toBeVisible();
    await noOverflow(page);
    await axe(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await page.getByLabel('Имя профиля').fill('ОченьДлинноеИмя'.repeat(6));
    await noOverflow(page);
    await context.addCookies(registeredCookies);
    await page.goto('/settings');
    await expect(page.getByLabel('Основная валюта')).toHaveValue('USD');
    await noOverflow(page);
    await axe(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await noOverflow(page);
    const save = page.getByRole('button', { name: 'Сохранить изменения' });
    await page.getByLabel('Имя профиля').fill('ДлинноеИмя'.repeat(10));
    await save.focus();
    await expect(save).toBeFocused();
    expect(await save.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe(
      'solid',
    );
    await noOverflow(page);
  });
}
test('keyboard-only login, pending и ошибки не теряются', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).focus();
  await page.keyboard.type('new@stage4.example');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Пароль', { exact: true })).toBeFocused();
  await page.keyboard.type(password);
  // Ответ задерживается явно управляемым promise, без зависимости от скорости API.
  let release: () => void = () => {
    throw new Error('Запрос ещё не начат');
  };
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/auth/login', async (route) => {
    await gate;
    await route.continue();
  });
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Подождите…' })).toBeDisabled();
  release();
  await expect(
    page.getByRole('heading', { name: 'Обзор', exact: true }),
  ).toBeVisible();
});

test('Nginx сохраняет Origin policy и не позволяет обойти rate limit подменой X-Forwarded-For', async ({
  request,
  baseURL,
}) => {
  const denied = await request.post('/api/v1/auth/logout', {
    headers: { Origin: 'https://evil.example' },
  });
  expect(denied.status()).toBe(403);
  const statuses: number[] = [];
  for (let index = 0; index < 8; index++) {
    const response = await request.post('/api/v1/AUTH/REGISTER/', {
      headers: { Origin: baseURL!, 'X-Forwarded-For': `192.0.2.${index + 1}` },
      data: {},
    });
    statuses.push(response.status());
  }
  expect(statuses.at(-1)).toBe(429);
});
