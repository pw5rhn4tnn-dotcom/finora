import { z } from 'zod';
import {
  recurringCreate,
  recurringUpdate,
  type RecurringDto,
  type RecurringInputDto,
  type RecurringPatchDto,
} from '@finora/api-client';
import { Button } from '../../shared/ui/Button';
import { Input, Select } from '../../shared/ui/Field';
import { SheetContent } from '../../shared/ui/Sheet';
import { ErrorState, LoadingState } from '../../shared/ui/States';
import { useAuth } from '../auth/auth-context';
import { usePreferenceOptions } from '../profile/preferences-query';
import { useFinancialMutation, useCategoryOptions, unwrap } from './api';
import { useFinancialForm, amountSchema, dateSchema } from './form';
import { dateText, todayInZone } from './format';

const dayOfMonthSchema = z.coerce
  .number()
  .int()
  .min(1, 'День от 1 до 31')
  .max(31, 'День от 1 до 31');
type FormValues = {
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  categoryId: string;
  description: string;
  currency: string;
  exchangeRate?: string;
  startDate: string;
  endDate: string;
  dayOfMonth: number;
};
const fields = [
  'amount',
  'type',
  'categoryId',
  'description',
  'currency',
  'exchangeRate',
  'startDate',
  'endDate',
  'dayOfMonth',
] as const;
const schema = z.object({
  amount: amountSchema,
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().uuid('Выберите категорию'),
  description: z
    .string()
    .trim()
    .min(1, 'Введите описание')
    .max(500, 'Не более 500 символов'),
  currency: z.string().min(1, 'Выберите валюту'),
  exchangeRate: z.string().optional(),
  startDate: dateSchema,
  endDate: z.union([dateSchema, z.literal('')]),
  dayOfMonth: dayOfMonthSchema,
});
export function RecurringForm({
  rule,
  close,
  restoreFocus,
}: {
  rule?: RecurringDto;
  close: () => void;
  restoreFocus?: () => void;
}) {
  const user = useAuth().data!;
  const categories = useCategoryOptions();
  const preferences = usePreferenceOptions();
  const { form, parse, showError } = useFinancialForm<FormValues>(
    rule
      ? {
          amount: rule.amount,
          type: rule.type,
          categoryId: rule.category.id,
          description: rule.description,
          currency: rule.currency,
          exchangeRate: rule.exchangeRate,
          startDate: rule.startDate,
          endDate: rule.endDate ?? '',
          dayOfMonth: rule.dayOfMonth,
        }
      : {
          amount: '',
          type: 'EXPENSE',
          categoryId: '',
          description: '',
          currency: user.baseCurrency,
          exchangeRate: '',
          startDate: todayInZone(user.timeZone),
          endDate: '',
          dayOfMonth: 1,
        },
    schema,
    fields,
  );
  const create = useFinancialMutation(
    async (input: RecurringInputDto) => unwrap(await recurringCreate(input)),
    close,
  );
  const update = useFinancialMutation(
    async (input: RecurringPatchDto) =>
      unwrap(await recurringUpdate(rule!.id, input)),
    close,
  );
  const pending =
    create.isPending || update.isPending || form.formState.isSubmitting;
  const type = form.watch('type'),
    currency = form.watch('currency');
  const options =
    categories.data?.filter(
      (c) => c.type === type && (!c.archivedAt || c.id === rule?.category.id),
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
      title={rule ? 'Изменить правило' : 'Новое регулярное правило'}
      description={`Ежемесячная операция создаётся автоматически. Основная валюта — ${user.baseCurrency}.`}
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
            const parsed = parse(data);
            if (!parsed) return;
            const digits =
              new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: parsed.currency,
              }).resolvedOptions().maximumFractionDigits ?? 2;
            if ((parsed.amount.split('.')[1]?.length ?? 0) > digits) {
              form.setError('amount', {
                message: `Для ${parsed.currency} допустимо ${digits} дробных знаков`,
              });
              form.setError('root', { message: 'Проверьте сумму.' });
              return;
            }
            let exchangeRate = '1';
            if (parsed.currency !== user.baseCurrency) {
              const value = (parsed.exchangeRate ?? '')
                .trim()
                .replace(',', '.');
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
              exchangeRate = value;
            }
            try {
              if (rule) {
                const patch: RecurringPatchDto = {
                  amount: parsed.amount,
                  type: parsed.type,
                  categoryId: parsed.categoryId,
                  description: parsed.description,
                  currency: parsed.currency,
                  exchangeRate,
                  dayOfMonth: parsed.dayOfMonth,
                  endDate: parsed.endDate || null,
                };
                await update.mutateAsync(patch);
              } else {
                const input: RecurringInputDto = {
                  amount: parsed.amount,
                  type: parsed.type,
                  categoryId: parsed.categoryId,
                  description: parsed.description,
                  currency: parsed.currency,
                  exchangeRate,
                  startDate: parsed.startDate,
                  ...(parsed.endDate ? { endDate: parsed.endDate } : {}),
                };
                await create.mutateAsync(input);
              }
            } catch (submitError) {
              showError(submitError);
            }
          })(e);
        }}
      >
        <fieldset className="finance-form" disabled={pending}>
          <legend className="sr-only">Поля регулярного правила</legend>
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
            label="Описание"
            maxLength={500}
            {...form.register('description')}
            error={error.description?.message}
          />
          {rule ? (
            <>
              <p className="field__hint">
                Дата начала: {dateText(rule.startDate)} (не меняется).
              </p>
              <Input
                label="День месяца"
                type="number"
                min={1}
                max={31}
                hint="При коротком месяце используется последний день. Изменение сначала догоняет пропущенные месяцы по старому дню, затем применяет новый."
                {...form.register('dayOfMonth')}
                error={error.dayOfMonth?.message}
              />
            </>
          ) : (
            <Input
              label="Дата первой операции"
              type="date"
              hint="Её календарный день становится днём месяца правила."
              {...form.register('startDate')}
              error={error.startDate?.message}
            />
          )}
          <Input
            label="Дата окончания"
            type="date"
            hint="Необязательно. Включительно; после неё правило архивируется автоматически."
            {...form.register('endDate')}
            error={error.endDate?.message}
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
              hint={`Стоимость 1 ${currency} в ${user.baseCurrency}. Сохраняется в правиле и используется при каждой генерации.`}
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
            {pending ? 'Сохраняем…' : 'Сохранить правило'}
          </Button>
        </fieldset>
        <p role="status">{pending ? 'Сохраняем правило…' : ''}</p>
      </form>
    </SheetContent>
  );
}
