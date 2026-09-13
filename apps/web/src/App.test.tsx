import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { App } from './App';

afterEach(cleanup);

test('монтирует приложение и показывает честное начальное состояние', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'Finora', level: 1 }),
  ).toBeDefined();
  expect(screen.getByRole('main').textContent).toContain(
    'Приложение в разработке.',
  );
});
