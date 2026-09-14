import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { test, expect, vi } from 'vitest';
import { z } from 'zod';
import type { BudgetDto, CategoryDto } from '@finora/api-client';
import { App } from '../../App';
import { AuthProvider } from '../auth/AuthProvider';
import { testUser } from '../../test/fixtures';
import { BudgetProgress } from './BudgetProgress';
import { todayInZone } from './format';
const category: CategoryDto = {
  id: 'fc6b14fd-aed4-493d-a009-2260ea371f53',
  name: 'Продукты',
  type: 'EXPENSE',
  icon: 'shopping-basket',
  color: '#4338A3',
  archivedAt: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};
const budget: BudgetDto = {
  id: 'a078f2d8-b61d-4872-aa09-98ecc2f0226e',
  categoryId: category.id,
  category,
  year: 2026,
  month: 9,
  limitAmount: '100',
  currency: 'RUB',
  spent: '25',
  remaining: '75',
  progress: '25.00',
  overBudget: false,
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
  path = '/budgets?period=2026-09',
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
    if (url.pathname.endsWith('/categories/options'))
      return Promise.resolve(Response.json([category]));
    if (url.pathname.endsWith('/budgets'))
      return Promise.resolve(
        Response.json({ items: [budget], page: 1, pageSize: 25, total: 1 }),
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
      name: mode === 'create' ? 'Добавить бюджет' : 'Изменить',
    }),
  );
  const dialog = within(screen.getByRole('dialog'));
  await waitFor(() =>
    expect(
      dialog
        .getByRole('button', { name: 'Сохранить бюджет' })
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
  await userEvent.type(dialog.getByLabelText('Лимит, RUB'), '10,50');
  return dialog;
}
test('Budget initial loading → populated, серверные spent/progress', async () => {
  const load = deferred();
  setup((url) =>
    url.pathname.endsWith('/budgets') ? load.promise : undefined,
  );
  expect(await screen.findByText('Загружаем бюджеты…')).not.toBeNull();
  await act(async () => {
    load.resolve(
      Response.json({ items: [budget], total: 1, page: 1, pageSize: 25 }),
    );
    await load.promise;
  });
  expect(
    (await screen.findByRole('progressbar')).getAttribute('aria-valuenow'),
  ).toBe('25');
  expect(screen.getByText('Осталось 75,00 RUB')).not.toBeNull();
});
test('Budget empty state и создание из пустого месяца', async () => {
  setup((url) =>
    url.pathname.endsWith('/budgets')
      ? Response.json({ items: [], total: 0, page: 1, pageSize: 25 })
      : undefined,
  );
  expect(await screen.findByText('На этот месяц бюджетов нет')).not.toBeNull();
  await userEvent.click(
    screen.getAllByRole('button', { name: 'Добавить бюджет' })[1]!,
  );
  expect(
    await screen.findByRole('dialog', { name: 'Новый бюджет' }),
  ).not.toBeNull();
});
test('Budget list error → retry', async () => {
  let fail = true;
  setup((url) =>
    url.pathname.endsWith('/budgets') && fail
      ? Response.json(
          { status: 503, errors: {}, detail: 'Бюджеты недоступны' },
          { status: 503 },
        )
      : undefined,
  );
  expect(await screen.findByText('Бюджеты недоступны')).not.toBeNull();
  fail = false;
  await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
  expect(await screen.findByRole('progressbar')).not.toBeNull();
});
test('Создание: decimal input, generated request, pending/double submit, success и обновление', async () => {
  const save = deferred();
  const { requests } = setup((url, init) =>
    url.pathname.endsWith('/budgets') && init?.method === 'POST'
      ? save.promise
      : undefined,
  );
  const dialog = await fill();
  await userEvent.dblClick(
    dialog.getByRole('button', { name: 'Сохранить бюджет' }),
  );
  const writes = () => requests.filter((r) => r.init?.method === 'POST');
  expect(writes()).toHaveLength(1);
  expect(JSON.parse(z.string().parse(writes()[0]!.init?.body))).toEqual({
    categoryId: category.id,
    limitAmount: '10.50',
    year: 2026,
    month: 9,
  });
  expect(
    dialog.getByRole('button', { name: 'Сохраняем…' }).hasAttribute('disabled'),
  ).toBe(true);
  await userEvent.keyboard('{Escape}');
  expect(screen.getByRole('dialog')).not.toBeNull();
  await act(async () => {
    save.resolve(Response.json(budget, { status: 201 }));
    await save.promise;
  });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByText('Бюджет создан.')).not.toBeNull();
  expect(
    requests.filter(
      (r) => r.url.pathname.endsWith('/budgets') && r.init?.method === 'GET',
    ).length,
  ).toBeGreaterThan(1);
});
test('Budget validation: обязательные поля, положительная сумма и precision валюты', async () => {
  const { requests } = setup();
  const dialog = await open();
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить бюджет' }),
  );
  expect(await dialog.findByText('Проверьте отмеченные поля.')).not.toBeNull();
  await userEvent.selectOptions(
    dialog.getByLabelText('Категория'),
    category.id,
  );
  for (const amount of ['0', '-1', 'NaN', '0.001']) {
    await userEvent.clear(dialog.getByLabelText('Лимит, RUB'));
    await userEvent.type(dialog.getByLabelText('Лимит, RUB'), amount);
    await userEvent.click(
      dialog.getByRole('button', { name: 'Сохранить бюджет' }),
    );
    expect(
      dialog.getByLabelText('Лимит, RUB').getAttribute('aria-invalid'),
    ).toBe('true');
  }
  expect(requests.filter((r) => r.init?.method === 'POST')).toHaveLength(0);
});
test('Budget mutation error сохраняет черновик и показывает field error, повтор успешен', async () => {
  let fail = true;
  setup((url, init) =>
    url.pathname.endsWith('/budgets') && init?.method === 'POST'
      ? fail
        ? Response.json(
            {
              status: 409,
              detail: 'Бюджет уже существует',
              errors: { categoryId: ['Выберите другую категорию или месяц'] },
            },
            { status: 409 },
          )
        : Response.json(budget, { status: 201 })
      : undefined,
  );
  const dialog = await fill();
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить бюджет' }),
  );
  expect((await dialog.findByRole('alert')).textContent).toContain(
    'Бюджет уже существует',
  );
  expect(dialog.getByLabelText<HTMLInputElement>('Лимит, RUB').value).toBe(
    '10,50',
  );
  expect(dialog.getByLabelText<HTMLSelectElement>('Категория').value).toBe(
    category.id,
  );
  fail = false;
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить бюджет' }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
test('Budget edit отправляет PATCH, обновляет результат без reload', async () => {
  const { requests } = setup((url, init) =>
    url.pathname.endsWith(budget.id) && init?.method === 'PATCH'
      ? Response.json({ ...budget, limitAmount: '150' })
      : undefined,
  );
  const dialog = await open('edit');
  expect(dialog.getByLabelText<HTMLInputElement>('Лимит, RUB').value).toBe(
    '100',
  );
  await userEvent.clear(dialog.getByLabelText('Лимит, RUB'));
  await userEvent.type(dialog.getByLabelText('Лимит, RUB'), '150');
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить бюджет' }),
  );
  expect(await screen.findByText('Бюджет изменён.')).not.toBeNull();
  expect(
    requests.some(
      (r) => r.init?.method === 'PATCH' && r.url.pathname.endsWith(budget.id),
    ),
  ).toBe(true);
});
test('Budget delete: отмена, ошибка с повтором, success', async () => {
  let fail = true;
  setup((url, init) =>
    url.pathname.endsWith(budget.id) && init?.method === 'DELETE'
      ? fail
        ? Response.json(
            { status: 503, errors: {}, detail: 'Удаление не выполнено' },
            { status: 503 },
          )
        : new Response(null, { status: 204 })
      : undefined,
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Удалить' }));
  await userEvent.click(screen.getByRole('button', { name: 'Отмена' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Удалить' }));
  await userEvent.click(
    screen.getByRole('button', { name: 'Подтвердить удаление' }),
  );
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Удаление не выполнено',
  );
  fail = false;
  await userEvent.click(
    screen.getByRole('button', { name: 'Подтвердить удаление' }),
  );
  expect(await screen.findByText('Бюджет удалён.')).not.toBeNull();
});
test('Budget options: income/archive скрыты при create; historical archive доступен при edit', async () => {
  setup((url) =>
    url.pathname.endsWith('/categories/options')
      ? Response.json([
          category,
          {
            ...category,
            id: '799f4ca6-c0db-4fb9-b1f1-e1801298f626',
            name: 'Доход',
            type: 'INCOME',
          },
          {
            ...category,
            id: 'fccdab3c-63d6-4161-a2dd-d90572cde032',
            name: 'Архив',
            archivedAt: category.createdAt,
          },
        ])
      : undefined,
  );
  const dialog = await open();
  expect(dialog.queryByRole('option', { name: 'Доход' })).toBeNull();
  expect(dialog.queryByRole('option', { name: /Архив/ })).toBeNull();
});
test('Budget категории error/retry не уничтожает введённую сумму', async () => {
  let fail = true;
  setup((url) =>
    url.pathname.endsWith('/categories/options') && fail
      ? Response.json(
          { status: 503, errors: {}, detail: 'Ошибка категорий' },
          { status: 503 },
        )
      : undefined,
  );
  await userEvent.click(
    await screen.findByRole('button', { name: 'Добавить бюджет' }),
  );
  const dialog = within(screen.getByRole('dialog'));
  await userEvent.type(dialog.getByLabelText('Лимит, RUB'), '25');
  expect(
    dialog
      .getByRole('button', { name: 'Сохранить бюджет' })
      .hasAttribute('disabled'),
  ).toBe(true);
  fail = false;
  await userEvent.click(
    await dialog.findByRole('button', { name: 'Повторить' }),
  );
  await waitFor(() =>
    expect(
      dialog
        .getByRole('button', { name: 'Сохранить бюджет' })
        .hasAttribute('disabled'),
    ).toBe(false),
  );
  expect(dialog.getByLabelText<HTMLInputElement>('Лимит, RUB').value).toBe(
    '25',
  );
});
for (const [name, changes, state, percent] of [
  [
    'zero',
    { spent: '0', remaining: '100', progress: '0.00' },
    'Осталось 100,00 RUB',
    '0',
  ],
  [
    'exact',
    { spent: '100', remaining: '0', progress: '100.00' },
    'Лимит исчерпан',
    '100',
  ],
  [
    'over',
    { spent: '125', remaining: '-25', progress: '125.00', overBudget: true },
    'Превышение на 25,00 RUB',
    '100',
  ],
] as const)
  test(`Budget progress ${name}: текст и ARIA, полоса ≤100`, () => {
    render(<BudgetProgress budget={{ ...budget, ...changes }} />);
    expect(screen.getByText(state)).not.toBeNull();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
      percent,
    );
    expect(
      screen.getByRole('progressbar').getAttribute('aria-valuetext'),
    ).toContain(state);
  });
test('Текущий месяц из профиля: UTC/local граница декабря и января', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-12-31T23:30:00Z'));
  try {
    expect(todayInZone('Europe/Moscow')).toBe('2027-01-01');
    expect(todayInZone('America/Los_Angeles')).toBe('2026-12-31');
    vi.setSystemTime(new Date('2024-03-01T00:30:00Z'));
    expect(todayInZone('America/Los_Angeles')).toBe('2024-02-29');
  } finally {
    vi.useRealTimers();
  }
});
test('Невалидный месяц URL не запускает двусмысленный запрос', async () => {
  const { requests } = setup(undefined, '/budgets?period=2026-13');
  expect(
    await screen.findByText('Укажите месяц в диапазоне 0001-01 — 9999-12'),
  ).not.toBeNull();
  expect(requests.some((r) => r.url.pathname.endsWith('/budgets'))).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Текущий месяц' }));
  expect(await screen.findByRole('progressbar')).not.toBeNull();
});
test('Повтор после server error: Escape не закрывает панель во время новой отправки', async () => {
  const save = deferred();
  let failed = false;
  setup((url, init) => {
    if (!url.pathname.endsWith('/budgets') || init?.method !== 'POST')
      return undefined;
    if (!failed) {
      failed = true;
      return Response.json(
        { status: 503, errors: {}, detail: 'Попробуйте снова' },
        { status: 503 },
      );
    }
    return save.promise;
  });
  const dialog = await fill();
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить бюджет' }),
  );
  expect(await dialog.findByRole('alert')).not.toBeNull();
  await userEvent.click(
    dialog.getByRole('button', { name: 'Сохранить бюджет' }),
  );
  await userEvent.keyboard('{Escape}');
  expect(screen.getByRole('dialog')).not.toBeNull();
  expect(dialog.getByLabelText<HTMLInputElement>('Лимит, RUB').value).toBe(
    '10,50',
  );
  await act(async () => {
    save.resolve(Response.json(budget, { status: 201 }));
    await save.promise;
  });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
test('Выбор месяца по-русски сбрасывает страницу и сохраняет год в API', async () => {
  const { requests } = setup(undefined, '/budgets?period=2026-12&page=3');
  await screen.findByRole('progressbar');
  await userEvent.selectOptions(
    screen.getByLabelText('Месяц', { exact: true }),
    '01',
  );
  await waitFor(() =>
    expect(
      requests.some(
        (r) =>
          r.url.searchParams.get('month') === '1' &&
          r.url.searchParams.get('year') === '2026' &&
          r.url.searchParams.get('page') === '1',
      ),
    ).toBe(true),
  );
  expect(screen.getByRole('option', { name: 'Январь' })).not.toBeNull();
});
test('Архивная категория прежнего бюджета остаётся в форме изменения', async () => {
  const archived = { ...category, archivedAt: category.createdAt };
  setup((url) =>
    url.pathname.endsWith('/categories/options')
      ? Response.json([archived])
      : url.pathname.endsWith('/budgets')
        ? Response.json({
            items: [{ ...budget, category: archived }],
            page: 1,
            pageSize: 25,
            total: 1,
          })
        : undefined,
  );
  const dialog = await open('edit');
  expect(
    dialog.getByRole('option', { name: 'Продукты · В архиве' }),
  ).not.toBeNull();
  expect(dialog.getByLabelText<HTMLSelectElement>('Категория').value).toBe(
    category.id,
  );
});
