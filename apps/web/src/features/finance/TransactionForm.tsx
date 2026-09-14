import { z } from 'zod';
import {
  transactionsCreate,
  transactionsUpdate,
  type TransactionDto,
  type TransactionInputDto,
} from '@finora/api-client';
import { Button } from '../../shared/ui/Button';
import { Input, Select } from '../../shared/ui/Field';
import { SheetContent } from '../../shared/ui/Sheet';
import { ErrorState, LoadingState } from '../../shared/ui/States';
import { useAuth } from '../auth/auth-context';
import { usePreferenceOptions } from '../profile/preferences-query';
import { useFinancialMutation, useCategoryOptions, unwrap } from './api';
import { useFinancialForm, amountSchema, dateSchema } from './form';
import { todayInZone } from './format';
const fields = [
  'amount',
  'type',
  'categoryId',
  'transactionDate',
  'description',
  'currency',
  'exchangeRate',
] as const;
const schema = z.object({
  amount: amountSchema,
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().uuid('Выберите категорию'),
  transactionDate: dateSchema,
  description: z
    .string()
    .trim()
    .min(1, 'Введите описание')
    .max(500, 'Не более 500 символов'),
  currency: z.string().min(1, 'Выберите валюту'),
  exchangeRate: z.string().optional(),
});
export function TransactionForm({
  transaction,
  close,
  restoreFocus,
}: {
  transaction?: TransactionDto;
  close: () => void;
  restoreFocus?: () => void;
}) {
  const user = useAuth().data!;
  const categories = useCategoryOptions();
  const preferences = usePreferenceOptions();
  const { form, parse, showError } = useFinancialForm<TransactionInputDto>(
    transaction
      ? {
          amount: transaction.amount,
          type: transaction.type,
          categoryId: transaction.categoryId,
          transactionDate: transaction.transactionDate,
          description: transaction.description,
          currency: transaction.currency,
          exchangeRate: transaction.exchangeRate,
        }
      : {
          amount: '',
          type: 'EXPENSE',
          categoryId: '',
          transactionDate: todayInZone(user.timeZone),
          description: '',
          currency: user.baseCurrency,
          exchangeRate: '',
        },
    schema,
    fields,
  );
  const save = useFinancialMutation(
    async (input: TransactionInputDto) =>
      unwrap(
        await (transaction
          ? transactionsUpdate(transaction.id, input)
          : transactionsCreate(input)),
      ),
    close,
  );
  const pending = save.isPending || form.formState.isSubmitting;
  const type = form.watch('type'),
    currency = form.watch('currency');
  const options =
    categories.data?.filter(
      (c) =>
        c.type === type && (!c.archivedAt || c.id === transaction?.categoryId),
    ) ?? [];
  const error = form.formState.errors;
  return (
    <SheetContent
      closeDisabled={pending}
      onCloseAutoFocus={
        restoreFocus
          ? (e) => {
              e.preventDefault();
              restoreFocus();
            }
          : undefined
      }
      title={transaction ? 'Изменить операцию' : 'Новая операция'}
      description={`Укажите сумму, категорию и дату. Основная валюта — ${user.baseCurrency}.`}
    >
      {(categories.isPending || preferences.isPending) && (
        <LoadingState label="Загружаем категории и валюты…" />
      )}
      {(categories.isError || preferences.isError) && (
        <ErrorState
          action={
            <Button
              onClick={() => {
                void categories.refetch();
                void preferences.refetch();
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
          void form.handleSubmit(async (data) => {
            if (pending) return;
            const input = parse(data);
            if (!input) return;
            const digits =
              new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: input.currency,
              }).resolvedOptions().maximumFractionDigits ?? 2;
            if ((input.amount.split('.')[1]?.length ?? 0) > digits) {
              form.setError('amount', {
                message: `Для ${input.currency} допустимо ${digits} дробных знаков`,
              });
              form.setError('root', { message: 'Проверьте сумму.' });
              return;
            }
            if (input.currency === user.baseCurrency) input.exchangeRate = '1';
            else {
              const value = (input.exchangeRate ?? '').trim().replace(',', '.');
              if (
                !/^(0|[1-9][0-9]{0,11})(\.[0-9]{1,12})?$/.test(value) ||
                !/[1-9]/.test(value)
              ) {
                form.setError('exchangeRate', {
                  message: 'Укажите положительный курс',
                });
                form.setError('root', { message: 'Проверьте курс.' });
                return;
              }
              input.exchangeRate = value;
            }
            try {
              await save.mutateAsync(input);
            } catch (error) {
              showError(error);
            }
          })(e);
        }}
      >
        <fieldset className="finance-form" disabled={pending}>
          <legend className="sr-only">Поля операции</legend>
          <Input
            label="Сумма"
            inputMode="decimal"
            autoComplete="off"
            {...form.register('amount')}
            error={error.amount?.message}
          />
          <Select
            label="Тип"
            {...form.register('type')}
            error={error.type?.message}
          >
            <option value="EXPENSE">Расход</option>
            <option value="INCOME">Доход</option>
          </Select>
          <Select
            label="Категория"
            {...form.register('categoryId')}
            error={error.categoryId?.message}
          >
            <option value="">Выберите категорию</option>
            {options.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
                {c.archivedAt ? ' · В архиве' : ''}
              </option>
            ))}
          </Select>
          {categories.isSuccess && options.length === 0 && (
            <p>
              Нет подходящих категорий. Создайте категорию нужного типа в
              разделе «Категории».
            </p>
          )}
          <Input
            label="Дата"
            type="date"
            {...form.register('transactionDate')}
            error={error.transactionDate?.message}
          />
          <Input
            label="Описание"
            maxLength={500}
            {...form.register('description')}
            error={error.description?.message}
          />
          <Select
            label="Валюта"
            {...form.register('currency', {
              onChange: () => form.setValue('exchangeRate', ''),
            })}
            error={error.currency?.message}
          >
            {preferences.data?.currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          {currency !== user.baseCurrency && (
            <Input
              label={`Курс к ${user.baseCurrency}`}
              inputMode="decimal"
              hint={`Стоимость 1 ${currency} в ${user.baseCurrency}. Сохраняется вместе с операцией.`}
              {...form.register('exchangeRate')}
              error={error.exchangeRate?.message}
            />
          )}
          {error.root && (
            <p className="field__error" role="alert">
              {error.root.message}
            </p>
          )}
          <Button
            type="submit"
            disabled={
              pending || !categories.isSuccess || !preferences.isSuccess
            }
          >
            {pending ? 'Сохраняем…' : 'Сохранить операцию'}
          </Button>
        </fieldset>
        <p role="status">{pending ? 'Сохраняем операцию…' : ''}</p>
      </form>
    </SheetContent>
  );
}
