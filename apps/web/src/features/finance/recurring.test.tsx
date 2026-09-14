import {
  render,
  screen,
  within,
  waitFor,
  act,
  fireEvent,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { test, expect, vi } from 'vitest';
import { z } from 'zod';
import type { CategoryDto, RecurringDto } from '@finora/api-client';
import { App } from '../../App';
import { AuthProvider } from '../auth/AuthProvider';
import { testUser, testOptions } from '../../test/fixtures';

const category: CategoryDto = {
  id: 'fc6b14fd-aed4-493d-a009-2260ea371f53',
  name: 'Аренда',
  type: 'EXPENSE',
  icon: 'house',
  color: '#4338A3',
  archivedAt: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};
const rule: RecurringDto = {
  id: 'a078f2d8-b61d-4872-aa09-98ecc2f0226e',
  category,
  type: 'EXPENSE',
  amount: '32000',
  currency: 'RUB',
  exchangeRate: '1',
  description: 'Аренда квартиры',
  frequency: 'MONTHLY',
  dayOfMonth: 8,
  startDate: '2026-09-08',
  endDate: null,
  nextOccurrenceDate: '2026-10-08',
  archivedAt: null,
  hasGeneratedTransactions: false,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
};
function deferred() {
  let resolve!: (r: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function setup(
  handler?: (
    url: URL,
    init?: RequestInit,
  ) => Response | Promise<Response> | undefined,
  path = '/recurring',
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
    if (url.pathname.endsWith('/categories/options'))
      return Promise.resolve(Response.json([category]));
    if (url.pathname.endsWith('/recurring-transactions'))
      return Promise.resolve(
        Response.json({ items: [rule], page: 1, pageSize: 25, total: 1 }),
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
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { client, requests };
}
async function open(mode: 'create' | 'edit' = 'create') {
  await userEvent.click(
    await screen.findByRole('button', {
      name: mode === 'create' ? 'Добавить правило' : 'Изменить',
    }),
  );
  const dialog = within(screen.getByRole('dialog'));
  await waitFor(() =>
    expect(
      dialog
        .getByRole('button', { name: 'Сохранить правило' })
        .hasAttribute('disabled'),
    ).toBe(false),
  );
  return dialog;
}
async function fill() {
  const dialog = await open();
  await userEvent.selectOptions(
    dialog.getByLabelText('Категория'),
    category.id,
  );
  await userEvent.type(dialog.getByLabelText('Сумма'), '32000');
  await userEvent.type(dialog.getByLabelText('Описание'), 'Аренда квартиры');
  fireEvent.change(dialog.getByLabelText('Дата первой операции'), {
    target: { value: '2026-11-08' },
  });
  return dialog;
}
test('Recurring: список загружается, показывает следующую дату и сумму', async () => {
  setup();
  expect(await screen.findByText('Аренда')).not.toBeNull();
  expect(screen.getByText('Аренда квартиры')).not.toBeNull();
  expect(screen.getByText(/08\.10\.2026/)).not.toBeNull();
  expect(screen.getByText('Активно')).not.toBeNull();
});
test('Recurring: пустой список и создание из пустого состояния', async () => {
  setup((url) =>
    url.pathname.endsWith('/recurring-transactions')
      ? Response.json({ items: [], total: 0, page: 1, pageSize: 25 })
      : undefined,
  );
  expect(
    await screen.findByText('Регулярных операций не найдено'),
  ).not.toBeNull();
  await userEvent.click(
    screen.getAllByRole('button', { name: 'Добавить правило' })[1]!,
  );
  expect(
    await screen.findByRole('dialog', { name: 'Новое регулярное правило' }),
  ).not.toBeNull();
});
test('Recurring: ошибка списка → retry', async () => {
  let fail = true;
  setup((url) =>
    url.pathname.endsWith('/recurring-transactions') && fail
      ? Response.json(
          { status: 503, errors: {}, detail: 'Правила недоступны' },
          { status: 503 },
        )
      : undefined,
  );
  expect(await screen.findByText('Правила недоступны')).not.toBeNull();
  fail = false;
  await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
  expect(await screen.findByText('Аренда')).not.toBeNull();
});
test('Recurring: создание — startDate задаёт день, PENDING/success, обновление списка', async () => {
  const save = deferred();
  const { requests } = setup((url, init) =>
    url.pathname.endsWith('/recurring-transactions') && init?.method === 'POST'
      ? save.promise
      : undefined,
  );
  const dialog = await fill();
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить правило' }),
  );
  const writes = () => requests.filter((r) => r.init?.method === 'POST');
  await waitFor(() => expect(writes()).toHaveLength(1));
  const body = z
    .record(z.string(), z.unknown())
    .parse(JSON.parse(z.string().parse(writes()[0]!.init?.body)));
  expect(body).toMatchObject({
    categoryId: category.id,
    amount: '32000',
    currency: 'RUB',
    exchangeRate: '1',
    type: 'EXPENSE',
    description: 'Аренда квартиры',
    startDate: '2026-11-08',
  });
  expect(body.dayOfMonth).toBeUndefined();
  expect(
    dialog.getByRole('button', { name: 'Сохраняем…' }).hasAttribute('disabled'),
  ).toBe(true);
  await act(async () => {
    save.resolve(Response.json(rule, { status: 201 }));
    await save.promise;
  });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByText('Правило создано.')).not.toBeNull();
});
test('Recurring: изменение показывает startDate только как подсказку и позволяет менять dayOfMonth', async () => {
  const { requests } = setup((url, init) =>
    url.pathname.endsWith(rule.id) && init?.method === 'PATCH'
      ? Response.json({ ...rule, dayOfMonth: 20 })
      : undefined,
  );
  const dialog = await open('edit');
  expect(dialog.queryByLabelText('Дата первой операции')).toBeNull();
  expect(dialog.getByText(/Дата начала: 08\.09\.2026/)).not.toBeNull();
  const day = dialog.getByLabelText<HTMLInputElement>('День месяца');
  expect(day.value).toBe('8');
  await userEvent.clear(day);
  await userEvent.type(day, '20');
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить правило' }),
  );
  expect(await screen.findByText('Правило изменено.')).not.toBeNull();
  const patch = requests.find(
    (r) => r.init?.method === 'PATCH' && r.url.pathname.endsWith(rule.id),
  );
  expect(JSON.parse(z.string().parse(patch?.init?.body))).toMatchObject({
    dayOfMonth: 20,
  });
});
test('Recurring: удаление ещё не создававшего операций правила — hard delete формулировка', async () => {
  setup((url, init) =>
    url.pathname.endsWith(rule.id) && init?.method === 'DELETE'
      ? Response.json({ outcome: 'deleted' })
      : undefined,
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Удалить' }));
  expect(screen.getByText(/будет удалено полностью/)).not.toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Подтвердить' }));
  expect(await screen.findByText('Правило удалено.')).not.toBeNull();
});
test('Recurring: удаление уже генерировавшего правила — архивирование, история сохраняется', async () => {
  setup((url, init) => {
    if (url.pathname.endsWith('/recurring-transactions'))
      return Response.json({
        items: [{ ...rule, hasGeneratedTransactions: true }],
        page: 1,
        pageSize: 25,
        total: 1,
      });
    if (url.pathname.endsWith(rule.id) && init?.method === 'DELETE')
      return Response.json({ outcome: 'archived' });
    return undefined;
  });
  await userEvent.click(
    await screen.findByRole('button', { name: 'Архивировать' }),
  );
  expect(screen.getByText(/будет заархивировано/)).not.toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Подтвердить' }));
  expect(
    await screen.findByText('Правило архивировано, история сохранена.'),
  ).not.toBeNull();
});
test('Recurring: архивное правило нельзя изменить из списка', async () => {
  setup((url) =>
    url.pathname.endsWith('/recurring-transactions')
      ? Response.json({
          items: [{ ...rule, archivedAt: '2026-10-01T00:00:00Z' }],
          page: 1,
          pageSize: 25,
          total: 1,
        })
      : undefined,
  );
  const card = within(
    (await screen.findByText(rule.description)).closest('.card')!,
  );
  expect(card.getByText('Архив')).not.toBeNull();
  // Disabled кнопки исключаются из accessibility tree: ищем по тексту.
  expect(
    card.getByText('Изменить').closest('button')?.hasAttribute('disabled'),
  ).toBe(true);
});
test('Recurring: валидация — обязательные поля и точность валюты', async () => {
  const { requests } = setup();
  const dialog = await open();
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить правило' }),
  );
  expect(await dialog.findByText('Проверьте отмеченные поля.')).not.toBeNull();
  await userEvent.selectOptions(
    dialog.getByLabelText('Категория'),
    category.id,
  );
  await userEvent.type(dialog.getByLabelText('Описание'), 'x');
  fireEvent.change(dialog.getByLabelText('Дата первой операции'), {
    target: { value: '2026-11-08' },
  });
  await userEvent.type(dialog.getByLabelText('Сумма'), '10.123');
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить правило' }),
  );
  expect(dialog.getByLabelText('Сумма').getAttribute('aria-invalid')).toBe(
    'true',
  );
  expect(requests.filter((r) => r.init?.method === 'POST')).toHaveLength(0);
});
