import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, test, vi } from 'vitest';
import { App } from '../../App';
import { AuthProvider } from './AuthProvider';
import { sessionKey } from './auth-context';
import { testUser, testOptions } from '../../test/fixtures';

function urlOf(input: RequestInfo | URL) {
  return typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url;
}
function respond(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation((input, init) =>
      Promise.resolve(handler(urlOf(input), init)),
    );
}
const problem = (status: number, detail: string, errors = {}) =>
  new Response(JSON.stringify({ status, detail, errors }), { status });
function mount(path = '/login') {
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
  return client;
}
function network(
  handler?: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  return respond((input, init) => {
    const url = urlOf(input);
    if (url.endsWith('/auth/me')) return problem(401, 'Войдите в аккаунт');
    if (url.endsWith('/settings/options')) return Response.json(testOptions);
    return handler
      ? handler(url, init)
      : problem(500, 'Не удалось выполнить запрос');
  });
}
async function fillLogin() {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Email'), 'test@example.com');
  await user.type(screen.getByLabelText('Пароль'), 'Strong-password-2026!');
  return user;
}
test('loading сессии объявляется до защищённого содержимого', async () => {
  let resolve: (value: Response) => void = () => {
    throw new Error('Запрос ещё не начат');
  };
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    () =>
      new Promise<Response>((done) => {
        resolve = done;
      }),
  );
  mount('/settings');
  expect(screen.getByRole('status').textContent).toContain('Проверяем сессию');
  expect(screen.queryByRole('heading', { name: 'Настройки' })).toBeNull();
  resolve(problem(401, 'Войдите'));
  expect(
    await screen.findByRole('heading', { name: 'Войти в Finora' }),
  ).toBeDefined();
});
test('ошибка проверки сессии допускает retry без показа профиля', async () => {
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(problem(503, 'База данных недоступна'));
  mount('/settings');
  expect(await screen.findByRole('alert')).toBeDefined();
  fetch.mockResolvedValue(Response.json(testUser));
  await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
  expect(
    await screen.findByRole('heading', { name: 'Настройки' }),
  ).toBeDefined();
});
test('login validation не отправляет запрос и переводит focus на поле', async () => {
  const fetch = network();
  mount();
  await userEvent.click(await screen.findByRole('button', { name: 'Войти' }));
  expect(await screen.findByRole('alert')).toBeDefined();
  expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe(
    'true',
  );
  expect(document.activeElement).toBe(screen.getByLabelText('Email'));
  expect(
    fetch.mock.calls.filter(([url]) => urlOf(url).endsWith('/auth/login')),
  ).toHaveLength(0);
});
test('login показывает безопасную ошибку, затем успешно входит и очищает кэш', async () => {
  let valid = false;
  respond(() =>
    valid ? Response.json(testUser) : problem(401, 'Неверный email или пароль'),
  );
  const client = mount();
  const user = await fillLogin();
  await user.click(screen.getByRole('button', { name: 'Войти' }));
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Неверный email или пароль',
  );
  client.setQueryData(['transactions', 'other-user'], {
    secret: 'чужие данные',
  });
  valid = true;
  await user.click(screen.getByRole('button', { name: 'Войти' }));
  expect(await screen.findByRole('heading', { name: 'Обзор' })).toBeDefined();
  expect(client.getQueryData(['transactions', 'other-user'])).toBeUndefined();
  expect(client.getQueryData(sessionKey)).toEqual(testUser);
});
test('pending блокирует повторный login; сетевой сбой допускает повтор', async () => {
  let reject: (error: Error) => void = () => {
    throw new Error('Запрос ещё не начат');
  };
  network(
    () =>
      new Promise<Response>((_resolve, fail) => {
        reject = fail;
      }),
  );
  mount();
  const user = await fillLogin();
  await user.click(screen.getByRole('button', { name: 'Войти' }));
  expect(
    screen.getByRole('button', { name: 'Подождите…' }).hasAttribute('disabled'),
  ).toBe(true);
  reject(new Error('internal transport details'));
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Нет связи с сервером',
  );
  expect(
    screen.getByRole('button', { name: 'Войти' }).hasAttribute('disabled'),
  ).toBe(false);
});
test('регистрация проверяет пароль и отображает серверную ошибку email', async () => {
  network(() =>
    problem(409, 'Email уже используется', {
      email: ['Выберите другой email'],
    }),
  );
  mount('/register');
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Имя профиля'), 'Тест');
  await user.type(screen.getByLabelText('Email'), 'test@example.com');
  await user.type(screen.getByLabelText('Пароль'), 'short');
  await user.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));
  expect(await screen.findByText('Не менее 12 символов')).toBeDefined();
  await user.clear(screen.getByLabelText('Пароль'));
  await user.type(screen.getByLabelText('Пароль'), 'Strong-password-2026!');
  await user.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));
  expect(await screen.findByText('Выберите другой email')).toBeDefined();
  expect(document.activeElement).toBe(screen.getByLabelText('Email'));
});
test('пустое имя и недоступный справочник имеют понятные состояния', async () => {
  const fetch = network();
  fetch.mockImplementation((input) =>
    Promise.resolve(
      urlOf(input).endsWith('/auth/me')
        ? problem(401, 'Войдите')
        : problem(500, 'Справочник недоступен'),
    ),
  );
  mount('/register');
  expect(await screen.findByText('Справочник недоступен')).toBeDefined();
  fetch.mockResolvedValue(Response.json(testOptions));
  await userEvent.click(
    screen.getByRole('button', { name: 'Повторить загрузку справочников' }),
  );
  expect(await screen.findByLabelText('Основная валюта')).toBeDefined();
});
test('профиль сохраняет реальные настройки, locked currency недоступна, success объявляется', async () => {
  const locked = { ...testUser, baseCurrencyLocked: true };
  respond((input, init) => {
    if (urlOf(input).endsWith('/options')) return Response.json(testOptions);
    if (init?.method === 'PATCH')
      return Response.json({
        ...locked,
        displayName: 'Новое имя',
        timeZone: 'UTC',
      });
    return Response.json(locked);
  });
  const client = mount('/settings');
  const user = userEvent.setup();
  const name = await screen.findByLabelText('Имя профиля');
  expect(
    (await screen.findByLabelText('Основная валюта')).hasAttribute('disabled'),
  ).toBe(true);
  await user.clear(name);
  await user.type(name, 'Новое имя');
  await user.selectOptions(screen.getByLabelText('Часовой пояс'), 'UTC');
  await user.click(screen.getByRole('button', { name: 'Сохранить изменения' }));
  expect(await screen.findByText('Настройки сохранены.')).toBeDefined();
  expect(client.getQueryData(sessionKey)).toMatchObject({
    displayName: 'Новое имя',
    timeZone: 'UTC',
  });
});
test('logout failure сохраняет сессию; успешный повтор удаляет весь пользовательский кэш', async () => {
  let fail = true;
  respond((input) =>
    urlOf(input).endsWith('/logout')
      ? fail
        ? problem(503, 'Повторите выход')
        : new Response(null, { status: 204 })
      : Response.json(testUser),
  );
  const client = mount('/');
  await screen.findByRole('heading', { name: 'Обзор' });
  client.setQueryData(['private-data'], 'данные');
  await userEvent.click(screen.getByRole('button', { name: 'Выйти' }));
  expect(await screen.findByText('Повторите выход')).toBeDefined();
  expect(client.getQueryData(sessionKey)).toEqual(testUser);
  fail = false;
  await userEvent.click(screen.getByRole('button', { name: 'Выйти' }));
  await waitFor(() => expect(client.getQueryData(sessionKey)).toBeNull());
  expect(client.getQueryData(['private-data'])).toBeUndefined();
});
test('401 при сохранении профиля удаляет старые данные и возвращает ко входу', async () => {
  let expired = false;
  respond((input, init) => {
    if (init?.method === 'PATCH') expired = true;
    return urlOf(input).endsWith('/options')
      ? Response.json(testOptions)
      : expired
        ? problem(401, 'Сессия истекла')
        : Response.json(testUser);
  });
  const client = mount('/settings');
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Имя профиля'), ' новый');
  await user.click(screen.getByRole('button', { name: 'Сохранить изменения' }));
  await waitFor(() => expect(client.getQueryData(sessionKey)).toBeNull());
  expect(
    await screen.findByRole('heading', { name: 'Войти в Finora' }),
  ).toBeDefined();
});

test('фоновая ошибка сессии сохраняет несохранённую форму и позволяет повтор', async () => {
  let unavailable = false;
  respond((url) =>
    url.endsWith('/options')
      ? Response.json(testOptions)
      : unavailable
        ? problem(503, 'База данных недоступна')
        : Response.json(testUser),
  );
  const client = mount('/settings');
  const user = userEvent.setup();
  await user.clear(await screen.findByLabelText('Имя профиля'));
  await user.type(screen.getByLabelText('Имя профиля'), 'Несохранённое имя');
  unavailable = true;
  await client.invalidateQueries({ queryKey: sessionKey });
  expect(await screen.findByText(/Не удалось обновить сессию/)).toBeDefined();
  expect(screen.getByLabelText<HTMLInputElement>('Имя профиля').value).toBe(
    'Несохранённое имя',
  );
  unavailable = false;
  await user.click(screen.getByRole('button', { name: 'Повторить проверку' }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
});

test('pending профиля блокирует выход, а поздний ответ не восстанавливает прежнего владельца', async () => {
  let complete: (value: Response) => void = () => {
    throw new Error('Запрос ещё не начат');
  };
  respond((url, init) =>
    url.endsWith('/options')
      ? Response.json(testOptions)
      : init?.method === 'PATCH'
        ? new Promise<Response>((resolve) => {
            complete = resolve;
          })
        : Response.json(testUser),
  );
  const client = mount('/settings');
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Имя профиля'), ' изменено');
  await user.click(screen.getByRole('button', { name: 'Сохранить изменения' }));
  expect(
    screen.getByRole('button', { name: 'Выйти' }).hasAttribute('disabled'),
  ).toBe(true);
  const other = {
    ...testUser,
    id: 'debdc611-c112-4f2c-b7ab-d0b342dc06b4',
    displayName: 'Другой профиль',
  };
  client.setQueryData(sessionKey, other);
  complete(Response.json({ ...testUser, displayName: 'Поздний ответ' }));
  await waitFor(() => expect(client.isMutating()).toBe(0));
  expect(client.getQueryData(sessionKey)).toEqual(other);
});
