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
import type { CategoryDto, TransactionDto } from '@finora/api-client';
import { App } from '../../App';
import { AuthProvider } from '../auth/AuthProvider';
import { replaceSession, sessionKey } from '../auth/auth-context';
import { testUser, testOptions } from '../../test/fixtures';
import { moneyText, todayInZone } from './format';
const category: CategoryDto = {
  id: 'fc6b14fd-aed4-493d-a009-2260ea371f53',
  name: 'Продукты',
  type: 'EXPENSE',
  icon: 'shopping-basket',
  color: '#4F46E5',
  archivedAt: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};
const transaction: TransactionDto = {
  id: 'a078f2d8-b61d-4872-aa09-98ecc2f0226e',
  categoryId: category.id,
  category,
  type: 'EXPENSE',
  amount: '12.34',
  currency: 'RUB',
  exchangeRate: '1',
  amountInBaseCurrency: '12.34',
  description: 'Покупка продуктов',
  transactionDate: '2026-09-14',
  source: 'MANUAL',
  recurringTransactionId: null,
  recurringOccurrenceDate: null,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
};
const problem = (
  status: number,
  detail = 'Не удалось сохранить',
  errors = {},
) => Response.json({ status, detail, errors }, { status });
function deferred() {
  let resolve!: (response: Response) => void;
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
  path = '/transactions',
) {
  const requests: { url: URL; init?: RequestInit }[] = [];
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation((input, init) => {
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
      if (url.pathname.endsWith('/categories'))
        return Promise.resolve(
          Response.json({ items: [category], page: 1, pageSize: 25, total: 1 }),
        );
      if (url.pathname.endsWith('/transactions'))
        return Promise.resolve(
          Response.json({
            items: [transaction],
            page: 1,
            pageSize: 25,
            total: 1,
          }),
        );
      return Promise.resolve(problem(500));
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
  return { client, requests, fetch };
}
async function openTransaction() {
  await userEvent.click(
    await screen.findByRole('button', { name: 'Добавить операцию' }),
  );
  const dialog = within(screen.getByRole('dialog'));
  await waitFor(() =>
    expect(
      dialog
        .getByRole('button', { name: 'Сохранить операцию' })
        .hasAttribute('disabled'),
    ).toBe(false),
  );
  return dialog;
}
async function fillTransaction() {
  const dialog = await openTransaction();
  await userEvent.type(dialog.getByLabelText('Сумма'), '10,50');
  await userEvent.selectOptions(
    dialog.getByLabelText('Категория'),
    category.id,
  );
  await userEvent.type(dialog.getByLabelText('Описание'), 'Новый расход');
  return dialog;
}
test('Decimal форматирование сохраняет крайние суммы и даты timezone', () => {
  expect(moneyText('9999999999999999.99', 'RUB')).toContain(
    '9 999 999 999 999 999,99',
  );
  expect(todayInZone('Pacific/Kiritimati')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
test('Список: loading, ошибка и retry, затем populated', async () => {
  const hold = deferred();
  let state = 0;
  setup((url) =>
    url.pathname.endsWith('/transactions')
      ? state === 0
        ? hold.promise
        : Response.json({
            items: [transaction],
            page: 1,
            pageSize: 25,
            total: 1,
          })
      : undefined,
  );
  expect(await screen.findByText('Загружаем операции…')).toBeDefined();
  state = 1;
  hold.resolve(problem(503, 'База недоступна'));
  expect(await screen.findByRole('alert')).toBeDefined();
  await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
  expect(await screen.findByText(transaction.description)).toBeDefined();
});
test('Пустой список отличается от filtered empty', async () => {
  setup((url) =>
    url.pathname.endsWith('/transactions')
      ? Response.json({ items: [], page: 1, pageSize: 25, total: 0 })
      : undefined,
  );
  expect(await screen.findByText('Пока нет операций')).toBeDefined();
  await userEvent.type(screen.getByLabelText('Поиск'), 'пусто');
  expect(
    await screen.findByText('По выбранным фильтрам ничего не найдено.'),
  ).toBeDefined();
});
test('Validation формы не отправляет POST, сообщает ошибку и focus', async () => {
  const { requests } = setup();
  const dialog = await openTransaction();
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить операцию' }),
  );
  expect(await dialog.findByRole('alert')).toBeDefined();
  await waitFor(() =>
    expect(document.activeElement).toBe(dialog.getByLabelText('Сумма')),
  );
  expect(requests.filter((r) => r.init?.method === 'POST')).toHaveLength(0);
});
test('Создание: double click, pending, confirmed success и invalidation', async () => {
  const hold = deferred();
  const { requests } = setup((url, init) =>
    url.pathname.endsWith('/transactions') && init?.method === 'POST'
      ? hold.promise
      : undefined,
  );
  const dialog = await fillTransaction();
  await userEvent.dblClick(
    dialog.getByRole('button', { name: 'Сохранить операцию' }),
  );
  expect(requests.filter((r) => r.init?.method === 'POST')).toHaveLength(1);
  expect(
    dialog.getByRole('button', { name: 'Сохраняем…' }).hasAttribute('disabled'),
  ).toBe(true);
  await userEvent.keyboard('{Escape}');
  expect(screen.getByRole('dialog')).toBeDefined();
  hold.resolve(Response.json(transaction, { status: 201 }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(await screen.findByText('Операция создана.')).toBeDefined();
  const body = z
    .record(z.string(), z.unknown())
    .parse(
      JSON.parse(
        z
          .string()
          .parse(requests.find((r) => r.init?.method === 'POST')!.init!.body),
      ),
    );
  expect(body.amount).toBe('10.50');
  expect(body.exchangeRate).toBe('1');
  expect(body.userId).toBeUndefined();
});
test('Network error сохраняет черновик, повтор и server field error доступны', async () => {
  let count = 0;
  setup((url, init) =>
    url.pathname.endsWith('/transactions') && init?.method === 'POST'
      ? ++count === 1
        ? Promise.reject(new TypeError('Network'))
        : problem(400, 'Категория недоступна', {
            categoryId: ['Категория недоступна'],
          })
      : undefined,
  );
  const dialog = await fillTransaction();
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить операцию' }),
  );
  expect(await dialog.findByRole('alert')).toBeDefined();
  expect(dialog.getByLabelText<HTMLInputElement>('Описание').value).toBe(
    'Новый расход',
  );
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить операцию' }),
  );
  await waitFor(() =>
    expect(
      dialog.getByLabelText('Категория').getAttribute('aria-invalid'),
    ).toBe('true'),
  );
});
test('Редактирование использует PATCH и сохранённый rate, смена валюты требует нового', async () => {
  const { requests } = setup((url, init) =>
    url.pathname.includes(transaction.id) && init?.method === 'PATCH'
      ? Response.json(transaction)
      : undefined,
  );
  await userEvent.click(
    await screen.findByRole('button', { name: 'Изменить' }),
  );
  const dialog = within(screen.getByRole('dialog'));
  await userEvent.selectOptions(dialog.getByLabelText('Валюта'), 'USD');
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить операцию' }),
  );
  expect(await dialog.findByRole('alert')).toBeDefined();
  expect(requests.filter((r) => r.init?.method === 'PATCH')).toHaveLength(0);
  await userEvent.type(dialog.getByLabelText('Курс к RUB'), '90,123');
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить операцию' }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(requests.filter((r) => r.init?.method === 'PATCH')).toHaveLength(1);
});
for (const status of [429, 503])
  test(`Удаление: ${status}, cancel, ошибка остаётся в dialog, pending и success`, async () => {
    const hold = deferred();
    let count = 0;
    let deleted = false;
    const { requests } = setup((url, init) => {
      if (url.pathname.includes(transaction.id) && init?.method === 'DELETE') {
        if (++count === 1) return problem(status);
        return hold.promise.then((response) => {
          deleted = true;
          return response;
        });
      }
      if (deleted && url.pathname.endsWith('/transactions'))
        return Response.json({ items: [], page: 1, pageSize: 25, total: 0 });
      return undefined;
    });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Удалить' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(requests.filter((r) => r.init?.method === 'DELETE')).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Удалить' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Подтвердить удаление' }),
    );
    expect(
      await within(screen.getByRole('dialog')).findByRole('alert'),
    ).toBeDefined();
    expect(screen.getByRole('table', { hidden: true }).textContent).toContain(
      transaction.description,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Подтвердить удаление' }),
    );
    expect(
      screen.getByRole('button', { name: 'Удаляем…' }).hasAttribute('disabled'),
    ).toBe(true);
    hold.resolve(new Response(null, { status: 204 }));
    expect(await screen.findByText('Операция удалена.')).toBeDefined();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText(transaction.description)).toBeNull();
    expect(requests.filter((r) => r.init?.method === 'DELETE')).toHaveLength(2);
  });
test('DELETE во время первого GET нового фильтра не оставляет удалённую строку', async () => {
  const stale = deferred();
  let deleted = false;
  let searches = 0;
  const { requests } = setup((url, init) => {
    if (init?.method === 'DELETE') {
      deleted = true;
      return new Response(null, { status: 204 });
    }
    if (
      url.pathname.endsWith('/transactions') &&
      url.searchParams.has('search')
    ) {
      searches++;
      if (searches === 1) return stale.promise;
      return Response.json({ items: [], page: 1, pageSize: 25, total: 0 });
    }
    return undefined;
  });
  const remove = await screen.findByRole('button', { name: 'Удалить' });
  // В одном JS turn: debounce начнёт новый GET уже при открытом подтверждении.
  act(() => {
    fireEvent.change(screen.getByLabelText('Поиск'), {
      target: { value: 'Покупка' },
    });
    fireEvent.click(remove);
  });
  await waitFor(() => expect(searches).toBe(1));
  await userEvent.click(
    screen.getByRole('button', { name: 'Подтвердить удаление' }),
  );
  await waitFor(() => expect(deleted).toBe(true));
  // Ответ содержит snapshot, прочитанный сервером ДО успешного DELETE.
  await act(async () => {
    stale.resolve(
      Response.json({ items: [transaction], page: 1, pageSize: 25, total: 1 }),
    );
    await stale.promise;
  });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(
    screen
      .queryAllByRole('row')
      .filter((row) => row.textContent?.includes(transaction.description)),
  ).toHaveLength(0);
  expect(searches).toBe(2);
  expect(
    requests.filter((request) => request.init?.method === 'DELETE'),
  ).toHaveLength(1);
});
test('Поиск/фильтры/pagination отправляются серверу; смена фильтра сбрасывает page', async () => {
  const { requests } = setup(undefined, '/transactions?page=3&pageSize=10');
  await screen.findByText(transaction.description);
  expect(
    requests
      .find((r) => r.url.pathname.endsWith('/transactions'))
      ?.url.searchParams.get('page'),
  ).toBe('3');
  await userEvent.selectOptions(
    screen.getByLabelText('Тип операции'),
    'INCOME',
  );
  await waitFor(() =>
    expect(
      requests.some(
        (r) =>
          r.url.searchParams.get('type') === 'INCOME' &&
          r.url.searchParams.get('page') === '1',
      ),
    ).toBe(true),
  );
  await userEvent.type(screen.getByLabelText('Поиск'), 'кириллица');
  await waitFor(() =>
    expect(
      requests.some((r) => r.url.searchParams.get('search') === 'кириллица'),
    ).toBe(true),
  );
});
test('Запоздалый ответ старого фильтра не подменяет актуальный список', async () => {
  const hold = deferred();
  setup((url) =>
    url.pathname.endsWith('/transactions') &&
    url.searchParams.get('search') === 'old'
      ? hold.promise
      : undefined,
  );
  await screen.findByText(transaction.description);
  await userEvent.type(screen.getByLabelText('Поиск'), 'old');
  await new Promise((resolve) => setTimeout(resolve, 350));
  await userEvent.clear(screen.getByLabelText('Поиск'));
  await userEvent.type(screen.getByLabelText('Поиск'), 'new');
  await screen.findByText(transaction.description);
  hold.resolve(
    Response.json({
      items: [{ ...transaction, description: 'Устаревшие данные' }],
      page: 1,
      pageSize: 25,
      total: 1,
    }),
  );
  await act(async () => {});
  expect(screen.queryByText('Устаревшие данные')).toBeNull();
});
test('401 финансового API очищает cache и возвращает вход', async () => {
  let expired = false;
  const { client } = setup((url) =>
    url.pathname.endsWith('/transactions')
      ? ((expired = true), problem(401))
      : url.pathname.endsWith('/auth/me') && expired
        ? problem(401)
        : undefined,
  );
  expect(
    await screen.findByRole('heading', { name: 'Войти в Finora' }),
  ).toBeDefined();
  expect(client.getQueryData(sessionKey)).toBeNull();
  expect(
    client.getQueryCache().findAll({ queryKey: ['finance'] }),
  ).toHaveLength(0);
});
test('Поздняя ошибка старого владельца не завершает новую сессию', async () => {
  const hold = deferred();
  let old = true;
  const { client } = setup((url) =>
    url.pathname.endsWith('/transactions') && old ? hold.promise : undefined,
  );
  await screen.findByText('Загружаем операции…');
  old = false;
  const next = { ...testUser, id: '1472b71f-cb74-49bb-8f81-2f34db4f3403' };
  await act(() => replaceSession(client, next));
  hold.resolve(problem(401));
  await act(async () => {});
  expect(client.getQueryData(sessionKey)).toEqual(next);
});
test('Категории: create/edit/delete используют generated client и подтверждение', async () => {
  const { requests } = setup(
    (url, init) =>
      url.pathname.endsWith('/categories') && init?.method === 'POST'
        ? Response.json(category, { status: 201 })
        : url.pathname.includes(category.id) && init?.method === 'PATCH'
          ? Response.json(category)
          : url.pathname.includes(category.id) && init?.method === 'DELETE'
            ? Response.json({ outcome: 'archived' })
            : undefined,
    '/categories',
  );
  await userEvent.click(
    await screen.findByRole('button', { name: 'Добавить категорию' }),
  );
  let dialog = within(screen.getByRole('dialog'));
  await userEvent.type(dialog.getByLabelText('Название'), 'Новая');
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить категорию' }),
  );
  expect(await screen.findByText('Категория создана.')).toBeDefined();
  await userEvent.click(screen.getByRole('button', { name: 'Изменить' }));
  dialog = within(screen.getByRole('dialog'));
  await userEvent.clear(dialog.getByLabelText('Название'));
  await userEvent.type(dialog.getByLabelText('Название'), 'Изменено');
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить категорию' }),
  );
  expect(await screen.findByText('Категория изменена.')).toBeDefined();
  await userEvent.click(screen.getByRole('button', { name: 'Удалить' }));
  await userEvent.click(
    screen.getByRole('button', { name: 'Подтвердить удаление' }),
  );
  expect(
    await screen.findByText('Категория перенесена в архив.'),
  ).toBeDefined();
  expect(
    requests.filter((r) =>
      ['POST', 'PATCH', 'DELETE'].includes(r.init?.method ?? ''),
    ),
  ).toHaveLength(3);
});

test('Открытая форма переживает исчезновение строки при background refetch', async () => {
  let removed = false;
  const { client } = setup((url) =>
    url.pathname.endsWith('/transactions') && removed
      ? Response.json({ items: [], page: 1, pageSize: 25, total: 0 })
      : undefined,
  );
  await userEvent.click(
    await screen.findByRole('button', { name: 'Изменить' }),
  );
  const dialog = within(screen.getByRole('dialog'));
  await userEvent.clear(dialog.getByLabelText('Описание'));
  await userEvent.type(dialog.getByLabelText('Описание'), 'Черновик');
  removed = true;
  await act(() => client.invalidateQueries({ queryKey: ['finance'] }));
  expect(dialog.getByLabelText<HTMLInputElement>('Описание').value).toBe(
    'Черновик',
  );
  expect(screen.getByRole('dialog')).toBeDefined();
  await userEvent.keyboard('{Escape}');
  expect(document.activeElement).toBe(screen.getByRole('main'));
});

test('Форма из empty state сохраняет черновик при появлении первой операции в фоне', async () => {
  let empty = true;
  const { client } = setup((url) =>
    url.pathname.endsWith('/transactions') && empty
      ? Response.json({ items: [], page: 1, pageSize: 25, total: 0 })
      : undefined,
  );
  await screen.findByText('Пока нет операций');
  await userEvent.click(
    screen.getAllByRole('button', { name: 'Добавить операцию' }).at(-1)!,
  );
  await userEvent.type(
    within(screen.getByRole('dialog')).getByLabelText('Описание'),
    'Черновик первой операции',
  );
  empty = false;
  await act(() => client.invalidateQueries({ queryKey: ['finance'] }));
  expect(
    within(screen.getByRole('dialog')).getByLabelText<HTMLInputElement>(
      'Описание',
    ).value,
  ).toBe('Черновик первой операции');
  await userEvent.keyboard('{Escape}');
  expect(document.activeElement).toBe(screen.getByRole('main'));
});
