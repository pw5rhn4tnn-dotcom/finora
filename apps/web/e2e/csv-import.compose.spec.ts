import { type Page } from '@playwright/test';
import { test, expect } from './compose-session';
import { z } from 'zod';

// Переиспользуем уже аутентифицированную сессию compose-auth setup вместо
// живого login(page) в каждом тесте: так тесты не расходуют общий login
// rate limit (10/60s), который иначе делят с auth.compose.spec.ts и
// finance.compose.spec.ts при последовательном запуске всего suite.

// CSV-импорт не отслеживается общей `finance` fixture (POST /imports
// возвращает счётчики, а не id созданных записей), поэтому тест сам находит
// и удаляет созданные им операции по уникальному описанию в finally.
async function cleanupBySearch(page: Page, search: string) {
  const response = await page.request.get(
    `/api/v1/transactions?search=${encodeURIComponent(search)}&pageSize=50`,
  );
  if (!response.ok()) return;
  const body = z
    .object({ items: z.array(z.object({ id: z.string().uuid() })) })
    .parse(await response.json());
  for (const item of body.items) {
    await page.request.delete(`/api/v1/transactions/${item.id}`, {
      headers: { Origin: new URL(page.url()).origin },
    });
  }
}

function csvBuffer(rows: string[]) {
  return Buffer.from(
    ['date,type,amount,currency,category,description', ...rows].join('\r\n') +
      '\r\n',
    'utf-8',
  );
}

test('Stage 9: мастер импорта CSV — upload → columns → categories → review → result', async ({
  page,
  context,
  sessions,
  unique,
}) => {
  const description = `Импорт CSV Stage9 ${unique}`;
  try {
    await context.addCookies(sessions.personal.cookies);
    await page.goto('/transactions/import');
    await expect(
      page.getByRole('heading', { name: 'Шаг 1 из 4. Загрузите CSV-файл' }),
    ).toBeVisible();
    await page.getByLabel('CSV-файл').setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer([
        `2026-09-05,EXPENSE,321.50,RUB,Продукты,${description}`,
      ]),
    });
    await expect(
      page.getByRole('heading', { name: 'Шаг 2 из 4. Сопоставьте столбцы' }),
    ).toBeVisible();
    await page.getByLabel('Дата операции').selectOption('date');
    await page.getByRole('button', { name: 'Продолжить' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Шаг 3 из 4. Категории и курсы валют',
      }),
    ).toBeVisible();
    await page
      .getByLabel('Продукты', { exact: true })
      .selectOption({ label: 'Продукты · Расход' });
    await page.getByRole('button', { name: 'Продолжить' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Шаг 4 из 4. Проверьте результат перед импортом',
      }),
    ).toBeVisible();
    await expect(page.getByText('Будет импортировано: 1')).toBeVisible();
    const commit = page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        new URL(r.url()).pathname === '/api/v1/imports',
    );
    await page
      .getByRole('button', { name: 'Импортировать 1 операций' })
      .click();
    const commitResponse = await commit;
    expect(commitResponse.status()).toBe(201);
    await expect(
      page.getByRole('heading', { name: 'Импорт завершён' }),
    ).toBeVisible();
    await expect(page.getByText('Импортировано операций: 1')).toBeVisible();
    await page.goto(`/transactions?search=${encodeURIComponent(description)}`);
    const row = page.getByRole('row').filter({ hasText: description });
    await expect(row).toBeVisible();
    await expect(row).toContainText('321,50 RUB');
    await expect(row).toContainText('Продукты');
  } finally {
    await cleanupBySearch(page, description);
  }
});

test('Stage 9: повторный импорт того же файла — вероятные дубли по умолчанию пропускаются', async ({
  page,
  context,
  sessions,
  unique,
}) => {
  const description = `Импорт CSV дубль ${unique}`;
  const file = {
    name: 'transactions.csv',
    mimeType: 'text/csv',
    buffer: csvBuffer([`2026-09-05,EXPENSE,10.00,RUB,Продукты,${description}`]),
  };
  const importOnce = async () => {
    await page.goto('/transactions/import');
    await page.getByLabel('CSV-файл').setInputFiles(file);
    await expect(
      page.getByRole('heading', { name: 'Шаг 2 из 4. Сопоставьте столбцы' }),
    ).toBeVisible();
    await page.getByLabel('Дата операции').selectOption('date');
    await page.getByRole('button', { name: 'Продолжить' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Шаг 3 из 4. Категории и курсы валют',
      }),
    ).toBeVisible();
    await page
      .getByLabel('Продукты', { exact: true })
      .selectOption({ label: 'Продукты · Расход' });
    await page.getByRole('button', { name: 'Продолжить' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Шаг 4 из 4. Проверьте результат перед импортом',
      }),
    ).toBeVisible();
  };
  try {
    await context.addCookies(sessions.personal.cookies);
    await importOnce();
    await expect(page.getByText('Будет импортировано: 1')).toBeVisible();
    await page
      .getByRole('button', { name: 'Импортировать 1 операций' })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Импорт завершён' }),
    ).toBeVisible();

    await importOnce();
    await expect(page.getByText('Будет импортировано: 0')).toBeVisible();
    await expect(page.getByText('Вероятные дубли: 1')).toBeVisible();
    await page.getByLabel('Включить вероятные дубли в импорт').check();
    await expect(page.getByText('Будет импортировано: 1')).toBeVisible();
  } finally {
    await cleanupBySearch(page, description);
  }
});

test('Stage 9: экспорт CSV — заголовки/BOM/формула-инъекция', async ({
  page,
  context,
  sessions,
  unique,
  finance,
}) => {
  const description = `=cmd|/c calc ${unique}`;
  await context.addCookies(sessions.personal.cookies);
  const categoryOptions = await page.request.get('/api/v1/categories/options');
  const groceries = z
    .array(z.object({ id: z.string(), name: z.string(), type: z.string() }))
    .parse(await categoryOptions.json())
    .find((c) => c.name === 'Продукты' && c.type === 'EXPENSE')!;
  await finance.create('transactions', {
    amount: '17.5',
    currency: 'RUB',
    categoryId: groceries.id,
    type: 'EXPENSE',
    transactionDate: '2026-09-05',
    description,
  });
  await page.goto('/transactions');
  await page.getByLabel('Поиск', { exact: true }).fill(description);
  await expect(
    page.getByRole('row').filter({ hasText: description }),
  ).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Экспорт CSV' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(
    /^finora-transactions-\d{4}-\d{2}-\d{2}\.csv$/,
  );
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const content = Buffer.concat(chunks);
  expect(content[0]).toBe(0xef);
  expect(content[1]).toBe(0xbb);
  expect(content[2]).toBe(0xbf);
  const text = content.toString('utf-8');
  expect(text).toContain(`'${description}`);
  expect(text).not.toContain(`,${description}`);
});

test('Stage 9: мобильный мастер импорта — без горизонтального переполнения', async ({
  page,
  context,
  sessions,
  unique,
}) => {
  const description = `Импорт CSV мобильный ${unique}`;
  await page.setViewportSize({ width: 375, height: 812 });
  try {
    await context.addCookies(sessions.personal.cookies);
    await page.goto('/transactions/import');
    await page.getByLabel('CSV-файл').setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer([
        `2026-09-05,EXPENSE,15.00,RUB,Продукты,${description}`,
      ]),
    });
    await expect(
      page.getByRole('heading', { name: 'Шаг 2 из 4. Сопоставьте столбцы' }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    await page.getByLabel('Дата операции').selectOption('date');
    await page.getByRole('button', { name: 'Продолжить' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Шаг 3 из 4. Категории и курсы валют',
      }),
    ).toBeVisible();
    await page
      .getByLabel('Продукты', { exact: true })
      .selectOption({ label: 'Продукты · Расход' });
    await page.getByRole('button', { name: 'Продолжить' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Шаг 4 из 4. Проверьте результат перед импортом',
      }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Импортировать 1 операций' })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Импорт завершён' }),
    ).toBeVisible();
  } finally {
    await cleanupBySearch(page, description);
  }
});
