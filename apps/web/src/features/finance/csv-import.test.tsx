import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { test, expect, vi } from 'vitest';
import { z } from 'zod';
import type { CategoryDto } from '@finora/api-client';
import { App } from '../../App';
import { AuthProvider } from '../auth/AuthProvider';
import { testUser, testOptions } from '../../test/fixtures';

const groceries: CategoryDto = {
  id: 'fc6b14fd-aed4-493d-a009-2260ea371f53',
  name: 'Продукты',
  type: 'EXPENSE',
  icon: 'shopping-basket',
  color: '#4F46E5',
  archivedAt: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};
const salary: CategoryDto = {
  id: '9c6a9a3b-3b0a-4e0a-9c0a-2260ea371f00',
  name: 'Зарплата',
  type: 'INCOME',
  icon: 'briefcase-business',
  color: '#059669',
  archivedAt: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

function readFormData(init: RequestInit | undefined) {
  const body = init?.body;
  if (!(body instanceof FormData))
    throw new Error('Ожидалась multipart FormData');
  return body;
}
function formField(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== 'string')
    throw new Error(`Поле ${key} должно быть текстовым, получен File/null`);
  return value;
}

function setup(
  handler?: (
    url: URL,
    formData: FormData,
  ) => Promise<Response> | Response | undefined,
) {
  const calls: { pathname: string; formData: FormData }[] = [];
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (input, init) => {
      const url = new URL(
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
        'http://finora.test',
      );
      if (url.pathname.endsWith('/auth/me')) return Response.json(testUser);
      if (url.pathname.endsWith('/settings/options'))
        return Response.json(testOptions);
      if (url.pathname.endsWith('/categories/options'))
        return Response.json([groceries, salary]);
      if (url.pathname.includes('/imports')) {
        const formData = readFormData(init);
        calls.push({ pathname: url.pathname, formData });
        const custom = handler?.(url, formData);
        if (custom) return custom;
      }
      return Response.json(
        { status: 500, detail: 'Не настроено в тесте', errors: {} },
        { status: 500 },
      );
    });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/transactions/import']}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { fetchSpy, calls };
}

function csvFile(content: string, name = 'transactions.csv') {
  return new File([content], name, { type: 'text/csv' });
}

test('CSV import wizard: полный путь upload → columns → categories → review → result', async () => {
  const user = userEvent.setup();
  const { calls } = setup((url) => {
    if (url.pathname.endsWith('/imports/preview'))
      return Response.json({
        columns: [
          'date',
          'type',
          'amount',
          'currency',
          'category',
          'description',
        ],
        sampleRows: [
          ['2026-09-05', 'EXPENSE', '450.00', 'RUB', 'Продукты', 'Пятёрочка'],
        ],
        totalRows: 1,
      });
    if (url.pathname.endsWith('/imports/validate')) {
      const last = calls.at(-1);
      const categoryMap = last
        ? (JSON.parse(formField(last.formData, 'categoryMap')) as Record<
            string,
            string
          >)
        : {};
      const mapped = Object.keys(categoryMap).length > 0;
      return Response.json({
        totalRows: 1,
        importableRows: mapped ? 1 : 0,
        duplicateRows: 0,
        invalidRows: mapped ? 0 : 1,
        rows: mapped
          ? [{ row: 1, status: 'valid', errors: [] }]
          : [
              {
                row: 1,
                status: 'invalid',
                errors: [
                  { field: 'category', message: 'Значение не сопоставлено' },
                ],
              },
            ],
        unmappedCategories: mapped ? [] : ['Продукты'],
        missingRateCurrencies: [],
      });
    }
    if (
      url.pathname.endsWith('/imports') &&
      !url.pathname.endsWith('/imports/preview') &&
      !url.pathname.endsWith('/imports/validate')
    )
      return Response.json(
        {
          totalRows: 1,
          importableRows: 1,
          duplicateRows: 0,
          invalidRows: 0,
          rows: [{ row: 1, status: 'valid', errors: [] }],
          unmappedCategories: [],
          missingRateCurrencies: [],
          imported: 1,
        },
        { status: 201 },
      );
    return undefined;
  });

  expect(
    await screen.findByRole('heading', {
      name: 'Шаг 1 из 4. Загрузите CSV-файл',
    }),
  ).toBeDefined();
  const input = screen.getByLabelText('CSV-файл');
  await user.upload(
    input,
    csvFile(
      'date,type,amount,currency,category,description\n2026-09-05,EXPENSE,450.00,RUB,Продукты,Пятёрочка\n',
    ),
  );

  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'Шаг 2 из 4. Сопоставьте столбцы' }),
    ).toBeDefined(),
  );
  // date/type/amount/currency/category/description совпадают с заголовками
  // файла и должны быть авто-сопоставлены — достаточно выбрать "Дата операции".
  await user.selectOptions(screen.getByLabelText('Дата операции'), 'date');
  await user.click(screen.getByRole('button', { name: 'Продолжить' }));

  await waitFor(() =>
    expect(
      screen.getByRole('heading', {
        name: 'Шаг 3 из 4. Категории и курсы валют',
      }),
    ).toBeDefined(),
  );
  expect(screen.getByText('Продукты')).toBeDefined();
  await user.selectOptions(screen.getByLabelText('Продукты'), groceries.id);
  await user.click(screen.getByRole('button', { name: 'Продолжить' }));

  await waitFor(() =>
    expect(
      screen.getByRole('heading', {
        name: 'Шаг 4 из 4. Проверьте результат перед импортом',
      }),
    ).toBeDefined(),
  );
  expect(screen.getByText('Будет импортировано: 1')).toBeDefined();
  await user.click(
    screen.getByRole('button', { name: 'Импортировать 1 операций' }),
  );

  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'Импорт завершён' }),
    ).toBeDefined(),
  );
  expect(screen.getByText(/Импортировано операций: 1/)).toBeDefined();

  const commitCall = calls.find(
    (c) =>
      c.pathname.endsWith('/imports') &&
      !c.pathname.endsWith('/preview') &&
      !c.pathname.endsWith('/validate'),
  );
  expect(commitCall).toBeDefined();
  const mapping = z
    .record(z.string(), z.string())
    .parse(JSON.parse(formField(commitCall!.formData, 'mapping')));
  expect(mapping['transactionDate']).toBe('date');
  const categoryMap = z
    .record(z.string(), z.string())
    .parse(JSON.parse(formField(commitCall!.formData, 'categoryMap')));
  expect(categoryMap['Продукты']).toBe(groceries.id);
});

test('CSV import wizard: неверное расширение файла показывает управляемую ошибку', async () => {
  // Настоящий браузер не блокирует выбор файла с несовпадающим accept (это
  // лишь подсказка ОС-диалогу, а не запрет), поэтому здесь событие change
  // отправляется напрямую — в отличие от userEvent.upload, которое в этой
  // версии library само фильтрует файлы по accept и не позволило бы
  // воспроизвести реальный сценарий.
  // Клиент не дублирует server-side проверку расширения — мок здесь
  // воспроизводит реальный ответ сервера (readCsvFile), чтобы проверить, что
  // wizard корректно показывает присланную им ошибку, а не свою выдумку.
  setup((url, formData) => {
    if (url.pathname.endsWith('/imports/preview')) {
      const file = formData.get('file');
      const name = file instanceof File ? file.name : '';
      if (!/\.csv$/i.test(name))
        return Response.json(
          {
            status: 400,
            detail: 'Ожидается файл с расширением .csv',
            errors: { file: ['Ожидается файл с расширением .csv'] },
          },
          { status: 400 },
        );
    }
    return undefined;
  });
  const input = await screen.findByLabelText('CSV-файл');
  const file = new File(['a,b\n1,2'], 'data.txt', { type: 'text/plain' });
  // jsdom не реализует DataTransfer/FileList: `files` подменяется напрямую,
  // как в стандартном для этой среды приёме имитации выбора файла.
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
  expect(
    await screen.findByText('Ожидается файл с расширением .csv'),
  ).toBeDefined();
  expect(
    screen.getByRole('heading', { name: 'Шаг 1 из 4. Загрузите CSV-файл' }),
  ).toBeDefined();
});
