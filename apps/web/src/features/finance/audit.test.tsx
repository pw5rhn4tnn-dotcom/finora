import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { test, expect, vi } from 'vitest';
import type { AuditEntryDto } from '@finora/api-client';
import { App } from '../../App';
import { AuthProvider } from '../auth/AuthProvider';
import { testUser, testOptions } from '../../test/fixtures';

const createEntry: AuditEntryDto = {
  id: '3a5b9b0e-1111-4a11-8a11-000000000001',
  entityType: 'Category',
  entityId: '3a5b9b0e-2222-4a11-8a11-000000000002',
  action: 'CREATE',
  before: null,
  after: {
    id: '3a5b9b0e-2222-4a11-8a11-000000000002',
    userId: testUser.id,
    name: 'Продукты',
    type: 'EXPENSE',
    icon: 'shopping-basket',
    color: '#4F46E5',
    archivedAt: null,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  createdAt: '2026-09-01T08:00:00.000Z',
};
const updateEntry: AuditEntryDto = {
  id: '3a5b9b0e-1111-4a11-8a11-000000000003',
  entityType: 'Transaction',
  entityId: '3a5b9b0e-2222-4a11-8a11-000000000004',
  action: 'UPDATE',
  before: {
    categoryId: createEntry.entityId,
    categoryName: 'Продукты',
    userId: testUser.id,
    type: 'EXPENSE',
    amount: '100',
    currency: 'RUB',
    exchangeRate: '1',
    amountInBaseCurrency: '100',
    description: 'До изменения',
    transactionDate: '2026-09-05',
    source: 'MANUAL',
    recurringTransactionId: null,
    recurringOccurrenceDate: null,
    createdAt: '2026-09-05T09:00:00.000Z',
    updatedAt: '2026-09-05T09:00:00.000Z',
  },
  after: {
    categoryId: createEntry.entityId,
    categoryName: 'Продукты',
    userId: testUser.id,
    type: 'EXPENSE',
    amount: '200',
    currency: 'RUB',
    exchangeRate: '1',
    amountInBaseCurrency: '200',
    description: 'После изменения',
    transactionDate: '2026-09-05',
    source: 'MANUAL',
    recurringTransactionId: null,
    recurringOccurrenceDate: null,
    createdAt: '2026-09-05T09:00:00.000Z',
    updatedAt: '2026-09-05T10:00:00.000Z',
  },
  createdAt: '2026-09-05T10:00:00.000Z',
};
function setup(
  handler?: (
    url: URL,
    init?: RequestInit,
  ) => Response | Promise<Response> | undefined,
) {
  const requests: { url: URL; init?: RequestInit }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = new URL(
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
      'http://finora.test',
    );
    requests.push({ url, init });
    const custom = handler?.(url, init);
    if (custom) return Promise.resolve(custom);
    if (url.pathname.endsWith('/auth/me'))
      return Promise.resolve(Response.json(testUser));
    if (url.pathname.endsWith('/settings/options'))
      return Promise.resolve(Response.json(testOptions));
    if (url.pathname.endsWith('/audit-log'))
      return Promise.resolve(
        Response.json({
          items: [updateEntry, createEntry],
          page: 1,
          pageSize: 25,
          total: 2,
        }),
      );
    return Promise.resolve(
      Response.json(
        { status: 500, errors: {}, detail: 'Ошибка сервера' },
        { status: 500 },
      ),
    );
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/audit-log']}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { client, requests };
}
test('Журнал изменений: список показывает тип/действие/время, не raw JSON', async () => {
  setup();
  await screen.findByRole('table', { name: 'Журнал изменений' });
  const rows = screen.getAllByRole('row').slice(1);
  expect(rows).toHaveLength(2);
  expect(within(rows[0]!).getByText('Операция')).not.toBeNull();
  expect(within(rows[0]!).getByText('Изменение')).not.toBeNull();
  expect(within(rows[1]!).getByText('Категория')).not.toBeNull();
  expect(within(rows[1]!).getByText('Создание')).not.toBeNull();
  expect(screen.queryByText(/"userId"/)).toBeNull();
  expect(screen.queryByText(/\{.*"amount"/)).toBeNull();
});
test('Журнал изменений: пустой список', async () => {
  setup((url) =>
    url.pathname.endsWith('/audit-log')
      ? Response.json({ items: [], total: 0, page: 1, pageSize: 25 })
      : undefined,
  );
  expect(await screen.findByText('Пока нет записей журнала')).not.toBeNull();
});
test('Журнал изменений: ошибка списка → retry', async () => {
  let fail = true;
  setup((url) =>
    url.pathname.endsWith('/audit-log') && fail
      ? Response.json(
          { status: 503, errors: {}, detail: 'Журнал недоступен' },
          { status: 503 },
        )
      : undefined,
  );
  expect(await screen.findByText('Журнал недоступен')).not.toBeNull();
  fail = false;
  await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
  expect(await screen.findByText('Категория')).not.toBeNull();
});
test('Журнал изменений: деталь UPDATE — только изменённые поля, читаемый diff', async () => {
  setup();
  await screen.findByText('Категория');
  const rows = screen.getAllByRole('button', { name: 'Подробнее' });
  // Первая строка — самая новая (UPDATE), согласно newest-first порядку ответа.
  await userEvent.click(rows[0]!);
  const dialog = within(await screen.findByRole('dialog'));
  expect(dialog.getByText(/100,00 RUB/)).not.toBeNull();
  expect(dialog.getByText(/200,00 RUB/)).not.toBeNull();
  expect(dialog.getByText('До изменения')).not.toBeNull();
  expect(dialog.getByText('После изменения')).not.toBeNull();
  // Категория не изменилась — поле не показывается как diff-строка вовсе.
  expect(dialog.queryByText('Категория')).toBeNull();
});
test('Журнал изменений: деталь CREATE — только «после», без «до»', async () => {
  setup();
  await screen.findByText('Категория');
  const rows = screen.getAllByRole('button', { name: 'Подробнее' });
  await userEvent.click(rows[1]!);
  const dialog = within(await screen.findByRole('dialog'));
  expect(dialog.getByText('Продукты')).not.toBeNull();
  expect(dialog.queryByText(/→/)).toBeNull();
});
test('Журнал изменений: фильтры меняют query параметры', async () => {
  const { requests } = setup();
  await screen.findByText('Категория');
  await userEvent.selectOptions(
    screen.getByLabelText('Тип сущности'),
    'Category',
  );
  await waitFor(() =>
    expect(
      requests.some(
        (r) =>
          r.url.pathname.endsWith('/audit-log') &&
          r.url.searchParams.get('entityType') === 'Category',
      ),
    ).toBe(true),
  );
  await userEvent.selectOptions(screen.getByLabelText('Действие'), 'ARCHIVE');
  await waitFor(() =>
    expect(
      requests.some(
        (r) =>
          r.url.pathname.endsWith('/audit-log') &&
          r.url.searchParams.get('action') === 'ARCHIVE',
      ),
    ).toBe(true),
  );
});
