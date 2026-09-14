import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { App } from './App';

function mount(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

test('монтирует Finora shell и честное предварительное состояние', () => {
  mount();
  expect(
    screen.getByRole('heading', { name: 'Обзор', level: 1 }),
  ).toBeDefined();
  expect(screen.getByRole('main').textContent).toContain(
    'Разделы в разработке',
  );
  expect(
    screen
      .getByRole('link', { name: 'Перейти к содержимому' })
      .getAttribute('href'),
  ).toBe('#main-content');
  expect(
    screen.queryByRole('button', { name: /Добавить операцию/ }),
  ).toBeNull();
});

test('desktop navigation переключает route, active state, title и focus', async () => {
  const user = userEvent.setup();
  mount();
  const nav = within(
    screen.getByRole('navigation', { name: 'Основная навигация' }),
  );
  await user.click(nav.getByRole('link', { name: 'Транзакции' }));
  expect(
    screen.getByRole('heading', { name: 'Транзакции', level: 1 }),
  ).toBeDefined();
  expect(
    nav.getByRole('link', { name: 'Транзакции' }).getAttribute('aria-current'),
  ).toBe('page');
  expect(
    nav.getByRole('link', { name: 'Обзор' }).hasAttribute('aria-current'),
  ).toBe(false);
  expect(document.title).toBe('Транзакции — Finora');
  expect(document.activeElement).toBe(screen.getByRole('main'));
});

test('desktop ссылки доступны через Enter', async () => {
  const user = userEvent.setup();
  mount();
  const link = within(
    screen.getByRole('navigation', { name: 'Основная навигация' }),
  ).getByRole('link', { name: 'Бюджеты' });
  link.focus();
  await user.keyboard('{Enter}');
  expect(
    screen.getByRole('heading', { name: 'Бюджеты', level: 1 }),
  ).toBeDefined();
});

test('mobile навигация содержит три основных ссылки и Ещё', () => {
  mount('/budgets');
  const nav = within(
    screen.getByRole('navigation', { name: 'Мобильная навигация' }),
  );
  expect(nav.getAllByRole('link').map((link) => link.textContent)).toEqual([
    'Обзор',
    'Транзакции',
    'Бюджеты',
  ]);
  expect(
    nav.getByRole('link', { name: 'Бюджеты' }).getAttribute('aria-current'),
  ).toBe('page');
  expect(nav.getByRole('button', { name: 'Ещё' })).toBeDefined();
});

test('Ещё открывает dialog, Escape возвращает focus на trigger', async () => {
  const user = userEvent.setup();
  mount();
  const trigger = screen.getByRole('button', { name: 'Ещё' });
  await user.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Ещё' });
  expect(dialog.contains(document.activeElement)).toBe(true);
  expect(within(dialog).getAllByRole('link')).toHaveLength(4);
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

test('выбор раздела из Ещё закрывает панель, переводит focus в контент и отмечает группу', async () => {
  const user = userEvent.setup();
  mount();
  await user.click(screen.getByRole('button', { name: 'Ещё' }));
  await user.click(
    within(screen.getByRole('dialog')).getByRole('link', {
      name: 'Журнал изменений',
    }),
  );
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(
    screen.getByRole('heading', { name: 'Журнал изменений', level: 1 }),
  ).toBeDefined();
  expect(
    screen.getByRole('button', { name: 'Ещё — текущий раздел' }).className,
  ).toContain('active');
  expect(document.activeElement).toBe(screen.getByRole('main'));
});

test('deep link CSV сохраняет активность Транзакций и остаётся placeholder', () => {
  mount('/transactions/import');
  expect(screen.getByRole('heading', { name: 'Импорт CSV' })).toBeDefined();
  const link = within(
    screen.getByRole('navigation', { name: 'Основная навигация' }),
  ).getByRole('link', { name: 'Транзакции' });
  expect(link.getAttribute('aria-current')).toBe('page');
  expect(screen.queryByLabelText(/файл/i)).toBeNull();
});

test('неизвестный route показывает понятную 404 и работающую ссылку назад', async () => {
  const user = userEvent.setup();
  mount('/unknown');
  expect(
    screen.getByRole('heading', { name: 'Страница не найдена' }),
  ).toBeDefined();
  await user.click(screen.getByRole('link', { name: 'Вернуться к обзору' }));
  expect(
    screen.getByRole('heading', { name: 'Обзор', level: 1 }),
  ).toBeDefined();
});
