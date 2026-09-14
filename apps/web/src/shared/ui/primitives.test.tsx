import type { SubmitEvent } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { Button, ButtonLink, IconButton } from './Button';
import { FilterBar, Input, Select } from './Field';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from './Sheet';
import { EmptyState, ErrorState, LoadingState } from './States';
import { Badge, Card, Divider, PageHeader, Section } from './Surface';

test('кнопка работает по Enter/Space, disabled не вызывает action и пропускается Tab', async () => {
  const user = userEvent.setup();
  const action = vi.fn();
  render(
    <>
      <Button onClick={action}>Действие</Button>
      <Button disabled onClick={action}>
        Недоступно
      </Button>
      <Button>Следующее</Button>
    </>,
  );
  await user.tab();
  await user.keyboard('{Enter} ');
  expect(action).toHaveBeenCalledTimes(2);
  await user.tab();
  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: 'Следующее' }),
  );
  await user.click(screen.getByRole('button', { name: 'Недоступно' }));
  expect(action).toHaveBeenCalledTimes(2);
});

test('button по умолчанию не submit; явный submit сохраняет HTML semantics', async () => {
  const user = userEvent.setup();
  const submit = vi.fn((event: SubmitEvent<HTMLFormElement>) =>
    event.preventDefault(),
  );
  render(
    <form onSubmit={submit}>
      <Button>Открыть</Button>
      <Button type="submit">Отправить</Button>
    </form>,
  );
  await user.click(screen.getByRole('button', { name: 'Открыть' }));
  expect(submit).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Отправить' }));
  expect(submit).toHaveBeenCalledOnce();
});

test('ButtonLink оставляет ссылку, IconButton имеет accessible name', () => {
  render(
    <>
      <ButtonLink>
        <a href="/">Обзор</a>
      </ButtonLink>
      <IconButton label="Закрыть">
        <span aria-hidden="true">×</span>
      </IconButton>
    </>,
  );
  expect(screen.getByRole('link', { name: 'Обзор' }).getAttribute('href')).toBe(
    '/',
  );
  expect(screen.getByRole('button', { name: 'Закрыть' })).toBeDefined();
});

test('Input связывает label, hint, error и внешний describedby, поддерживает ввод', async () => {
  const user = userEvent.setup();
  render(
    <>
      <p id="context">Контекст</p>
      <Input
        label="Название"
        hint="Подсказка"
        error="Обязательное поле"
        aria-describedby="context"
      />
    </>,
  );
  const input = screen.getByRole('textbox', { name: 'Название' });
  expect(input.getAttribute('aria-invalid')).toBe('true');
  const descriptions = input
    .getAttribute('aria-describedby')
    ?.split(' ')
    .map((id) => document.getElementById(id)?.textContent);
  expect(descriptions).toEqual(['Контекст', 'Подсказка', 'Обязательное поле']);
  await user.type(input, 'Текст');
  expect((input as HTMLInputElement).value).toBe('Текст');
});

test('поля имеют уникальные ids, disabled и явный id сохраняются', async () => {
  const user = userEvent.setup();
  render(
    <>
      <Input label="Первое" />
      <Input id="fixed" label="Второе" disabled defaultValue="Не меняется" />
    </>,
  );
  const first = screen.getByLabelText('Первое');
  const second = screen.getByLabelText('Второе');
  expect(first.id).not.toBe(second.id);
  expect(second.id).toBe('fixed');
  await user.type(second, 'Новое');
  expect((second as HTMLInputElement).value).toBe('Не меняется');
});

test('Select использует native выбор, FilterBar получает имя группы', async () => {
  const user = userEvent.setup();
  render(
    <FilterBar>
      <Select label="Состояние">
        <option value="all">Все</option>
        <option value="ready">Готово</option>
      </Select>
    </FilterBar>,
  );
  const select = within(
    screen.getByRole('group', { name: 'Фильтры' }),
  ).getByRole('combobox', { name: 'Состояние' });
  await user.selectOptions(select, 'ready');
  expect((select as HTMLSelectElement).value).toBe('ready');
});

test('поверхности сохраняют headings и текстовое обозначение статуса', () => {
  render(
    <>
      <PageHeader title="Страница" description="Описание" />
      <Section title="Раздел">
        <Card>
          <Badge tone="warning">Внимание</Badge>
          <Divider />
        </Card>
      </Section>
    </>,
  );
  expect(
    screen.getByRole('heading', { name: 'Страница', level: 1 }),
  ).toBeDefined();
  expect(
    screen.getByRole('heading', { name: 'Раздел', level: 2 }),
  ).toBeDefined();
  expect(screen.getByText('Внимание')).toBeDefined();
  expect(screen.getByRole('separator')).toBeDefined();
});

test('LoadingState объявляет загрузку один раз и скрывает декоративные skeletons', () => {
  render(<LoadingState label="Загружаем раздел…" />);
  const status = screen.getByRole('status');
  expect(status.textContent).toBe('Загружаем раздел…');
  expect(status.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4);
});

test('EmptyState имеет описание и optional action', async () => {
  const user = userEvent.setup();
  const action = vi.fn();
  const { rerender } = render(
    <EmptyState title="Пока пусто" description="Добавьте запись." />,
  );
  expect(screen.queryByRole('button')).toBeNull();
  rerender(
    <EmptyState
      title="Пока пусто"
      description="Добавьте запись."
      action={<Button onClick={action}>Продолжить</Button>}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Продолжить' }));
  expect(action).toHaveBeenCalledOnce();
  expect(screen.getByText('Добавьте запись.')).toBeDefined();
});

test('ErrorState даёт безопасное сообщение и вызывает retry', async () => {
  const user = userEvent.setup();
  const retry = vi.fn();
  render(<ErrorState action={<Button onClick={retry}>Повторить</Button>} />);
  expect(screen.getByRole('alert').textContent).toContain(
    'Не удалось загрузить данные',
  );
  await user.click(screen.getByRole('button', { name: 'Повторить' }));
  expect(retry).toHaveBeenCalledOnce();
});

test('Sheet удерживает focus при Tab/Shift+Tab, закрывается кнопкой и возвращает trigger', async () => {
  const user = userEvent.setup();
  render(
    <Sheet>
      <SheetTrigger asChild>
        <Button>Открыть</Button>
      </SheetTrigger>
      <SheetContent title="Панель" description="Описание">
        <Input label="Имя" />
        <SheetClose asChild>
          <Button>Готово</Button>
        </SheetClose>
      </SheetContent>
    </Sheet>,
  );
  const trigger = screen.getByRole('button', { name: 'Открыть' });
  await user.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Панель' });
  const close = within(dialog).getByRole('button', { name: 'Закрыть панель' });
  const done = within(dialog).getByRole('button', { name: 'Готово' });
  expect(document.activeElement).toBe(close);
  await user.tab({ shift: true });
  expect(document.activeElement).toBe(done);
  await user.tab();
  expect(document.activeElement).toBe(close);
  await user.click(close);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
