import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { expect, test, vi } from 'vitest';
import { App } from '../../App';
import { AuthProvider } from '../auth/AuthProvider';
import { replaceSession, sessionKey } from '../auth/auth-context';
import { testUser } from '../../test/fixtures';
import { dashboardFixture } from '../../test/dashboard-fixture';
import { moneyText } from '../finance/format';

function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return {
    resolve: async (response: Response) => {
      resolve(response);
      await promise;
    },
    promise,
  };
}
function setup(
  handler?: (
    url: URL,
    init?: RequestInit,
  ) => Response | Promise<Response> | undefined,
  path = '/?period=2026-01',
) {
  const calls: { url: URL; signal?: AbortSignal | null }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = new URL(
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
      'http://finora.test',
    );
    calls.push({ url, signal: init?.signal });
    const response = handler?.(url, init);
    if (response) return Promise.resolve(response);
    if (url.pathname.endsWith('/auth/me'))
      return Promise.resolve(Response.json(testUser));
    if (url.pathname.endsWith('/dashboard'))
      return Promise.resolve(
        Response.json(
          dashboardFixture(
            Number(url.searchParams.get('year')),
            Number(url.searchParams.get('month')),
          ),
        ),
      );
    return Promise.resolve(
      Response.json(
        { status: 503, detail: 'Не удалось загрузить данные', errors: {} },
        { status: 503 },
      ),
    );
  });
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
  function mount() {
    return render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <MemoryRouter initialEntries={[path]}>
            <App />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    );
  }
  const view = mount();
  return { client, calls, view, mount };
}
const response = (month: number, income: string) =>
  Response.json(
    dashboardFixture(2026, month, {
      income,
      expense: '0',
      net: income,
      savingsRate: '100.00',
      hasTransactions: true,
    }),
  );
const metric = () =>
  within(screen.getByRole('heading', { name: 'Доходы' }).closest('.card')!);
const changeMonth = async (month: string) =>
  userEvent.selectOptions(await screen.findByLabelText('Месяц'), month);
const rendered = async (month: string) =>
  screen.findByLabelText(`Финансы: ${month} 2026`);

test('точное форматирование отрицательной дроби и суммы выше safe integer', () => {
  expect(moneyText('-0.1', 'RUB')).toBe('−0,10 RUB');
  expect(moneyText('99999999999999999999.99', 'RUB').replace(/\s/g, '')).toBe(
    '99999999999999999999,99RUB',
  );
});
test('loading → пустой обзор: zero KPI, нет выдуманных insights/регулярных операций, шесть строк', async () => {
  const pending = deferred();
  setup((u) =>
    u.pathname.endsWith('/dashboard') ? pending.promise : undefined,
  );
  expect(await screen.findByText('Загружаем обзор…')).toBeDefined();
  expect(screen.queryByRole('heading', { name: 'Доходы' })).toBeNull();
  await act(() => pending.resolve(Response.json(dashboardFixture(2026, 1))));
  await rendered('Январь');
  expect(screen.getByText('За этот месяц операций пока нет')).toBeDefined();
  expect(screen.getByText('Не определена')).toBeDefined();
  expect(
    screen.getByText('Пока недостаточно оснований для наблюдений.'),
  ).toBeDefined();
  expect(screen.getByText(/Здесь пока нет расписания/)).toBeDefined();
  await userEvent.click(screen.getByText('Точные значения за шесть месяцев'));
  expect(screen.getAllByRole('row')).toHaveLength(7);
});
test('доходы без расходов — partial state, точная сумма и savings', async () => {
  setup((u) =>
    u.pathname.endsWith('/dashboard')
      ? response(1, '9999999999999999.99')
      : undefined,
  );
  await rendered('Январь');
  expect(
    metric().getByText(
      moneyText('9999999999999999.99', 'RUB').replace(/\s/g, ' '),
    ),
  ).toBeDefined();
  expect(screen.getByText('В этом месяце расходов нет.')).toBeDefined();
  expect(screen.getByText('100,00%')).toBeDefined();
});
test('A→B: B завершается первым, поздний A не меняет DOM и не восстанавливает cache data', async () => {
  const a = deferred(),
    b = deferred();
  const { calls, client } = setup((u) =>
    u.pathname.endsWith('/dashboard')
      ? u.searchParams.get('month') === '1'
        ? a.promise
        : b.promise
      : undefined,
  );
  await changeMonth('02');
  await act(() => b.resolve(response(2, '222')));
  await rendered('Февраль');
  expect(metric().getByText('222,00 RUB')).toBeDefined();
  expect(
    calls.find((c) => c.url.searchParams.get('month') === '1')!.signal!.aborted,
  ).toBe(true);
  await act(() => a.resolve(response(1, '111')));
  expect(metric().getByText('222,00 RUB')).toBeDefined();
  expect(
    client.getQueryData([
      'finance',
      testUser.id,
      'dashboard',
      { year: 2026, month: 1 },
    ]),
  ).toBeUndefined();
});
test('январь→февраль→март: обратное завершение всех трёх запросов', async () => {
  const pending = [deferred(), deferred(), deferred()];
  setup((u) =>
    u.pathname.endsWith('/dashboard')
      ? pending[Number(u.searchParams.get('month')) - 1]!.promise
      : undefined,
  );
  await changeMonth('02');
  await changeMonth('03');
  await act(() => pending[2]!.resolve(response(3, '333')));
  await rendered('Март');
  await act(async () => {
    await pending[1]!.resolve(response(2, '222'));
    await pending[0]!.resolve(response(1, '111'));
  });
  expect(metric().getByText('333,00 RUB')).toBeDefined();
  expect(screen.queryByLabelText('Финансы: Февраль 2026')).toBeNull();
});
test('поздний 503 и 401 предыдущего периода не перекрывает новый успех и не завершает сессию', async () => {
  const pending = [deferred(), deferred()];
  const { client } = setup((u) =>
    u.pathname.endsWith('/dashboard') && Number(u.searchParams.get('month')) < 3
      ? pending[Number(u.searchParams.get('month')) - 1]!.promise
      : undefined,
  );
  await changeMonth('02');
  await changeMonth('03');
  await rendered('Март');
  await act(async () => {
    await pending[0]!.resolve(Response.json({ status: 503 }, { status: 503 }));
    await pending[1]!.resolve(Response.json({ status: 401 }, { status: 401 }));
  });
  expect(client.getQueryData(sessionKey)).toEqual(testUser);
  expect(screen.queryByRole('alert')).toBeNull();
  await rendered('Март');
});
test('ошибка → retry → успех того же периода', async () => {
  let calls = 0;
  setup((u) =>
    u.pathname.endsWith('/dashboard')
      ? ++calls === 1
        ? Response.json({ status: 503 }, { status: 503 })
        : response(1, '321')
      : undefined,
  );
  await userEvent.click(
    await screen.findByRole('button', { name: 'Повторить' }),
  );
  await rendered('Январь');
  expect(metric().getByText('321,00 RUB')).toBeDefined();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(calls).toBe(2);
});

test('retry повторяет текущий период, после смены поздний retry не заменяет новый результат', async () => {
  const late = deferred();
  let first = true;
  const { calls } = setup((u) => {
    if (
      u.pathname.endsWith('/dashboard') &&
      u.searchParams.get('month') === '1'
    ) {
      if (first) {
        first = false;
        return Response.json({ status: 503 }, { status: 503 });
      }
      return late.promise;
    }
    return undefined;
  });
  await userEvent.click(
    await screen.findByRole('button', { name: 'Повторить' }),
  );
  await changeMonth('02');
  await rendered('Февраль');
  await act(() => late.resolve(response(1, '111')));
  await rendered('Февраль');
  expect(
    calls
      .filter((c) => c.url.pathname.endsWith('/dashboard'))
      .map((c) => c.url.searchParams.get('month')),
  ).toEqual(['1', '1', '2']);
});
test('unmount/remount отменяет первую медленную загрузку и получает новый снимок', async () => {
  const late = deferred();
  let count = 0;
  const { view, mount, calls } = setup((u) =>
    u.pathname.endsWith('/dashboard')
      ? ++count === 1
        ? late.promise
        : response(1, '444')
      : undefined,
  );
  await screen.findByText('Загружаем обзор…');
  view.unmount();
  mount();
  await rendered('Январь');
  await act(() => late.resolve(response(1, '111')));
  expect(metric().getByText('444,00 RUB')).toBeDefined();
  expect(
    calls.filter((c) => c.url.pathname.endsWith('/dashboard')),
  ).toHaveLength(2);
});
test('logout→login другого владельца: поздний ответ не возвращает чужой cache и DOM', async () => {
  const late = deferred();
  let owner = testUser;
  let count = 0;
  const other = {
    ...testUser,
    id: '11b08aec-b289-44a9-b188-29c2e356c82c',
    displayName: 'Другой профиль',
  };
  const { client } = setup((u) => {
    if (u.pathname.endsWith('/auth/me')) return Response.json(owner);
    if (u.pathname.endsWith('/dashboard'))
      return ++count === 1 ? late.promise : response(1, '888');
    return undefined;
  });
  await screen.findByText('Загружаем обзор…');
  await act(async () => {
    await replaceSession(client, null);
    owner = other;
    await replaceSession(client, other);
  });
  await rendered('Январь');
  await act(() => late.resolve(response(1, '111')));
  expect(metric().getByText('888,00 RUB')).toBeDefined();
  expect(
    client.getQueryCache().findAll({ queryKey: ['finance', testUser.id] }),
  ).toHaveLength(0);
});
test('текущий 401 завершает сессию и удаляет финансовые данные', async () => {
  const { client } = setup((u) =>
    u.pathname.endsWith('/dashboard')
      ? Response.json({ status: 401 }, { status: 401 })
      : undefined,
  );
  expect(
    await screen.findByRole('heading', { name: 'Войти в Finora' }),
  ).toBeDefined();
  await waitFor(() =>
    expect(
      client.getQueryCache().findAll({ queryKey: ['finance'] }),
    ).toHaveLength(0),
  );
});
test('невалидный период не отправляется в API и исправляется кнопкой текущего месяца', async () => {
  const { calls } = setup(undefined, '/?period=2026-13');
  expect(
    await screen.findByText('Укажите месяц в диапазоне 0001-06 — 9999-12'),
  ).toBeDefined();
  expect(
    calls.filter((c) => c.url.pathname.endsWith('/dashboard')),
  ).toHaveLength(0);
  await userEvent.click(screen.getByRole('button', { name: 'Текущий месяц' }));
  await waitFor(() =>
    expect(
      calls.filter((c) => c.url.pathname.endsWith('/dashboard')),
    ).toHaveLength(1),
  );
});
