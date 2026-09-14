import { test, expect } from './dashboard-session';
import { login } from './budget-session';
import type { Page, Route } from '@playwright/test';
import type { DashboardDto } from '@finora/api-client';
import AxeBuilder from '@axe-core/playwright';
const category = (unique: string) => ({
  name: `Обзор ${unique}`,
  type: 'EXPENSE',
  icon: 'wallet',
  color: '#4338A3',
});
const transaction = (
  categoryId: string,
  year: number,
  month: string,
  amount: string,
) => ({
  categoryId,
  transactionDate: `${year}-${month}-15`,
  type: 'EXPENSE',
  currency: 'RUB',
  amount,
  description: `Dashboard ${year}-${month}`,
});
const expense = (page: Page) => page.locator('.dashboard-metric--expense > p');
function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
async function loaded(page: Page, month: string, year: number) {
  await expect(page.getByLabel(`Финансы: ${month} ${year}`)).toBeVisible();
}
async function hold(
  route: Route,
  ready: ReturnType<typeof gate>,
  release: ReturnType<typeof gate>,
  done: ReturnType<typeof gate>,
) {
  const snapshot = await route.fetch();
  ready.resolve();
  await release.promise;
  try {
    await route.fulfill({ response: snapshot });
  } finally {
    done.resolve();
  }
}

test('seed: один Dashboard response, KPI/Top-5/бюджеты и другой владелец', async ({
  page,
  family,
}) => {
  const received = page.waitForResponse(
    '**/api/v1/dashboard?year=2026&month=9',
  );
  await page.goto('/?period=2026-09');
  const r = await received;
  expect(r.status()).toBe(200);
  const snapshot = (await r.json()) as DashboardDto;
  await loaded(page, 'Сентябрь', 2026);
  expect(snapshot.trend).toHaveLength(6);
  expect(snapshot.topCategories).toHaveLength(5);
  await expect(page.locator('.dashboard-top li')).toHaveCount(5);
  await expect(page.locator('.dashboard-metric--income')).toContainText(
    '118 500,00 RUB',
  );
  expect(snapshot.insights.length).toBeGreaterThanOrEqual(2);
  const other = await family.request.get('/api/v1/dashboard?year=2026&month=9');
  expect(other.status()).toBe(200);
  const otherData = (await other.json()) as DashboardDto;
  expect(otherData.expense).not.toBe(snapshot.expense);
  expect(
    snapshot.distribution.every(
      (c) =>
        !otherData.distribution.some((f) => c.category.id === f.category.id),
    ),
  ).toBe(true);
});

test('critical: A→B и январь→февраль→март с обратной доставкой настоящих снимков', async ({
  page,
  data,
  year,
  unique,
}) => {
  const id = await data.create('categories', category(unique));
  for (const [month, amount] of [
    ['01', '111'],
    ['02', '222'],
    ['03', '333'],
  ])
    await data.create('transactions', transaction(id, year, month!, amount!));
  const a = { ready: gate(), release: gate(), done: gate() },
    b = { ready: gate(), release: gate(), done: gate() };
  let holdFebruary = false;
  await page.route('**/api/v1/dashboard?*', async (route) => {
    const month = new URL(route.request().url()).searchParams.get('month');
    if (month === '1') return hold(route, a.ready, a.release, a.done);
    if (month === '2' && holdFebruary)
      return hold(route, b.ready, b.release, b.done);
    return route.continue();
  });
  try {
    await page.goto(`/?period=${year}-01`);
    await a.ready.promise;
    await expect(page.getByText('Загружаем обзор…')).toBeVisible();
    await page.getByLabel('Месяц', { exact: true }).selectOption('02');
    await loaded(page, 'Февраль', year);
    await expect(expense(page)).toHaveText('222,00 RUB');
    a.release.resolve();
    await a.done.promise;
    await expect(expense(page)).toHaveText('222,00 RUB');
    // Повторно получаем реальные ответы в обратном порядке после remount.
    await page.unrouteAll({ behavior: 'wait' });
    const january = { ready: gate(), release: gate(), done: gate() };
    holdFebruary = true;
    await page.route('**/api/v1/dashboard?*', async (route) => {
      const month = new URL(route.request().url()).searchParams.get('month');
      if (month === '1')
        return hold(route, january.ready, january.release, january.done);
      if (month === '2') return hold(route, b.ready, b.release, b.done);
      return route.continue();
    });
    try {
      await page.goto(`/?period=${year}-01`);
      await january.ready.promise;
      await page.getByLabel('Месяц', { exact: true }).selectOption('02');
      await b.ready.promise;
      await page.getByLabel('Месяц', { exact: true }).selectOption('03');
      await loaded(page, 'Март', year);
      await expect(expense(page)).toHaveText('333,00 RUB');
      b.release.resolve();
      await b.done.promise;
      january.release.resolve();
      await january.done.promise;
      await expect(expense(page)).toHaveText('333,00 RUB');
    } finally {
      january.release.resolve();
      b.release.resolve();
    }
  } finally {
    a.release.resolve();
    b.release.resolve();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('critical: создание операции отменяет первый GET и обновляет KPI, chart, Top-5 и budget', async ({
  page,
  data,
  year,
  unique,
}) => {
  const id = await data.create('categories', category(unique));
  await data.create('budgets', {
    categoryId: id,
    year,
    month: 1,
    limitAmount: '100',
  });
  const ready = gate(),
    release = gate(),
    done = gate();
  let calls = 0;
  await page.route('**/api/v1/dashboard?*', async (route) => {
    if (++calls === 1) return hold(route, ready, release, done);
    return route.continue();
  });
  try {
    await page.goto(`/?period=${year}-01`);
    await ready.promise;
    await page
      .getByRole('button', { name: 'Добавить операцию', exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Категория', { exact: true }).selectOption(id);
    await dialog.getByLabel('Сумма', { exact: true }).fill('125.10');
    await dialog.getByLabel('Описание').fill(`Создана с Dashboard ${unique}`);
    await dialog.getByLabel('Дата', { exact: true }).fill(`${year}-01-31`);
    await dialog.getByRole('button', { name: 'Сохранить операцию' }).click();
    await expect(dialog).toBeHidden();
    await loaded(page, 'Январь', year);
    await expect(expense(page)).toHaveText('125,10 RUB');
    release.resolve();
    await done.promise;
    await expect(expense(page)).toHaveText('125,10 RUB');
    expect(calls).toBe(2);
    await expect(page.locator('.dashboard-top')).toContainText('125,10 RUB');
    await expect(page.locator('.budget-card')).toContainText(
      'Превышение на 25,10 RUB',
    );
    const api = await page.request.get(
      `/api/v1/dashboard?year=${year}&month=1`,
    );
    expect(((await api.json()) as DashboardDto).expense).toBe('125.1');
    await page.reload();
    await expect(expense(page)).toHaveText('125,10 RUB');
  } finally {
    release.resolve();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('503 → retry успешно восстанавливает тот же месяц', async ({
  page,
  data,
  year,
  unique,
}) => {
  const id = await data.create('categories', category(unique));
  await data.create('transactions', transaction(id, year, '01', '321'));
  let calls = 0;
  await page.route('**/api/v1/dashboard?*', (route) =>
    ++calls === 1
      ? route.fulfill({ status: 503, json: { status: 503 } })
      : route.continue(),
  );
  await page.goto(`/?period=${year}-01`);
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await loaded(page, 'Январь', year);
  await expect(expense(page)).toHaveText('321,00 RUB');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(calls).toBe(2);
});

test('ошибка → retry текущего месяца; поздняя ошибка старого месяца не перекрывает успех', async ({
  page,
  year,
}) => {
  let failed = false;
  const ready = gate(),
    release = gate(),
    done = gate();
  await page.route('**/api/v1/dashboard?*', async (route) => {
    const month = new URL(route.request().url()).searchParams.get('month');
    if (month === '1' && !failed) {
      failed = true;
      return route.fulfill({ status: 503, json: { status: 503 } });
    }
    if (month === '1') {
      ready.resolve();
      await release.promise;
      try {
        await route.fulfill({ status: 503, json: { status: 503 } });
      } finally {
        done.resolve();
      }
      return;
    }
    return route.continue();
  });
  try {
    await page.goto(`/?period=${year}-01`);
    await page.getByRole('button', { name: 'Повторить', exact: true }).click();
    await ready.promise;
    await page.getByLabel('Месяц', { exact: true }).selectOption('02');
    await loaded(page, 'Февраль', year);
    release.resolve();
    await done.promise;
    await expect(page.getByRole('alert')).toHaveCount(0);
    await loaded(page, 'Февраль', year);
  } finally {
    release.resolve();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('critical: logout → вход другого пользователя с задержанным старым Dashboard', async ({
  page,
  data,
  year,
  unique,
}) => {
  const id = await data.create('categories', category(unique));
  await data.create('transactions', transaction(id, year, '01', '777'));
  const ready = gate(),
    release = gate(),
    done = gate();
  let first = true;
  await page.route('**/api/v1/dashboard?*', async (route) => {
    if (first) {
      first = false;
      return hold(route, ready, release, done);
    }
    return route.continue();
  });
  try {
    await page.goto(`/?period=${year}-01`);
    await ready.promise;
    await page.getByRole('button', { name: 'Выйти', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await login(page, true);
    await page.getByLabel('Год', { exact: true }).fill(String(year));
    await page.getByLabel('Месяц', { exact: true }).selectOption('01');
    await loaded(page, 'Январь', year);
    await expect(expense(page)).toHaveText('0,00 RUB');
    release.resolve();
    await done.promise;
    await expect(expense(page)).toHaveText('0,00 RUB');
    await page
      .getByRole('navigation', { name: 'Основная навигация' })
      .getByRole('link', { name: 'Бюджеты', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Бюджеты', exact: true, level: 1 }),
    ).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Основная навигация' })
      .getByRole('link', { name: 'Обзор', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Обзор', exact: true, level: 1 }),
    ).toBeVisible();
    await page.getByLabel('Год', { exact: true }).fill(String(year));
    await page.getByLabel('Месяц', { exact: true }).selectOption('01');
    for (const [width, height] of [
      [390, 844],
      [640, 320],
      [1440, 960],
    ] as const) {
      await page.setViewportSize({ width, height });
      await loaded(page, 'Январь', year);
      await expect(expense(page)).toHaveText('0,00 RUB');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await expect(
      page.getByText(`Обзор ${unique}`, { exact: true }),
    ).toHaveCount(0);
  } finally {
    release.resolve();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

for (const [width, height] of [
  [320, 740],
  [390, 844],
  [640, 320],
  [768, 1024],
  [1024, 768],
  [1440, 960],
  [1920, 1080],
] as const)
  test(`responsive ${width}: реальные данные, длинные суммы, keyboard, 200% text, axe`, async ({
    page,
    data,
    year,
    unique,
  }, info) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const name =
      'ОченьДлинноеНазваниеКатегории'.repeat(3).slice(0, 80) + unique;
    const id = await data.create('categories', { ...category(unique), name });
    await data.create(
      'transactions',
      transaction(id, year, '01', '9999999999999999.99'),
    );
    await data.create('budgets', {
      categoryId: id,
      year,
      month: 1,
      limitAmount: '1',
    });
    await page.goto(`/?period=${year}-01`);
    await loaded(page, 'Январь', year);
    const summary = page.getByText('Точные значения за шесть месяцев');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('table')).toBeVisible();
    for (const scale of [100, 200]) {
      await page.evaluate((size) => {
        document.documentElement.style.fontSize = `${size}%`;
      }, scale);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await page
          .locator('.dashboard-content')
          .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
      const path = info.outputPath(`dashboard-${width}-${scale}.png`);
      await page.screenshot({ path, fullPage: true });
      await info.attach(`dashboard ${width} ${scale}%`, {
        path,
        contentType: 'image/png',
      });
    }
  });
