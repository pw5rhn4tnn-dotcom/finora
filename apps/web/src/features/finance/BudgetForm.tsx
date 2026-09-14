import { monthNames } from './month-names';
import type { RefObject } from 'react';
import { z } from 'zod';
import {
  budgetsCreate,
  budgetsUpdate,
  type BudgetDto,
  type BudgetInputDto,
} from '@finora/api-client';
import { useAuth } from '../auth/auth-context';
import { useCategoryOptions, useFinancialMutation, unwrap } from './api';
import { amountSchema, useFinancialForm } from './form';
import { Button } from '../../shared/ui/Button';
import { Input, Select } from '../../shared/ui/Field';
import { SheetContent } from '../../shared/ui/Sheet';
import { LoadingState, ErrorState } from '../../shared/ui/States';
const fields = ['categoryId', 'year', 'month', 'limitAmount'] as const;
const schema = z.object({
  categoryId: z.string().uuid('Выберите категорию расходов'),
  year: z
    .number()
    .int()
    .min(1, 'Год от 1 до 9999')
    .max(9999, 'Год от 1 до 9999'),
  month: z.number().int().min(1, 'Выберите месяц').max(12, 'Выберите месяц'),
  limitAmount: amountSchema,
});
export function BudgetForm({
  budget,
  year,
  month,
  close,
  restoreFocus,
  submissionLockRef,
}: {
  budget?: BudgetDto;
  year: number;
  month: number;
  close: () => void;
  restoreFocus: () => void;
  submissionLockRef: RefObject<boolean>;
}) {
  const user = useAuth().data!;
  const categories = useCategoryOptions();
  const busyRef = submissionLockRef;
  const { form, parse, showError } = useFinancialForm<BudgetInputDto>(
    {
      categoryId: budget?.categoryId ?? '',
      year: budget?.year ?? year,
      month: budget?.month ?? month,
      limitAmount: budget?.limitAmount ?? '',
    },
    schema,
    fields,
  );
  const save = useFinancialMutation(
    async (input: BudgetInputDto) =>
      unwrap(
        await (budget ? budgetsUpdate(budget.id, input) : budgetsCreate(input)),
      ),
    close,
  );
  const pending = save.isPending || form.formState.isSubmitting;
  const errors = form.formState.errors;
  const options =
    categories.data?.filter(
      (c) =>
        c.type === 'EXPENSE' && (!c.archivedAt || c.id === budget?.categoryId),
    ) ?? [];
  return (
    <SheetContent
      title={budget ? 'Изменить бюджет' : 'Новый бюджет'}
      description={`Месячный лимит расходов в ${user.baseCurrency}. Операции учитываются автоматически.`}
      closeDisabled={pending}
      onCloseAutoFocus={(e) => {
        e.preventDefault();
        restoreFocus();
      }}
    >
      {categories.isPending && <LoadingState label="Загружаем категории…" />}
      {categories.isError && (
        <ErrorState
          action={
            <Button
              onClick={() => {
                void categories.refetch();
              }}
            >
              Повторить
            </Button>
          }
        />
      )}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (busyRef.current) return;
          busyRef.current = true;
          void form
            .handleSubmit(async (data) => {
              const input = parse(data);
              if (!input) return;
              const digits =
                new Intl.NumberFormat('ru-RU', {
                  style: 'currency',
                  currency: user.baseCurrency,
                }).resolvedOptions().maximumFractionDigits ?? 2;
              if ((input.limitAmount.split('.')[1]?.length ?? 0) > digits) {
                form.setError('limitAmount', {
                  message: `Для ${user.baseCurrency} допустимо ${digits} дробных знаков`,
                });
                return;
              }
              try {
                await save.mutateAsync(input);
              } catch (error) {
                showError(error);
              }
            })(e)
            .finally(() => {
              busyRef.current = false;
            });
        }}
      >
        <fieldset className="finance-form" disabled={pending}>
          <legend className="sr-only">Поля бюджета</legend>
          <Select
            label="Категория"
            {...form.register('categoryId')}
            value={form.watch('categoryId')}
            error={errors.categoryId?.message}
          >
            <option value="">Выберите категорию расходов</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.archivedAt ? ' · В архиве' : ''}
              </option>
            ))}
          </Select>
          {categories.isSuccess && !options.length && (
            <p>
              Нет активных категорий расходов. Создайте категорию в разделе
              «Категории».
            </p>
          )}
          <Select
            label="Месяц бюджета"
            {...form.register('month', { valueAsNumber: true })}
            error={errors.month?.message}
          >
            {monthNames.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </Select>
          <Input
            label="Год бюджета"
            type="number"
            min={1}
            max={9999}
            {...form.register('year', { valueAsNumber: true })}
            error={errors.year?.message}
          />
          <Input
            label={`Лимит, ${user.baseCurrency}`}
            inputMode="decimal"
            autoComplete="off"
            {...form.register('limitAmount')}
            error={errors.limitAmount?.message}
          />
          {budget?.category.archivedAt && (
            <p>
              У архивной категории можно изменить лимит прежнего месяца. Для
              другого периода выберите активную категорию.
            </p>
          )}
          {errors.root && (
            <p role="alert" className="field__error">
              {errors.root.message}
            </p>
          )}
          <Button type="submit" disabled={pending || !categories.isSuccess}>
            {pending ? 'Сохраняем…' : 'Сохранить бюджет'}
          </Button>
        </fieldset>
        <p role="status">{pending ? 'Сохраняем бюджет…' : ''}</p>
      </form>
    </SheetContent>
  );
}
