import { z } from 'zod';
import { Prisma } from '../../generated/prisma/client.js';
import { Problem } from '../../common/problem.js';
import { currencies } from '../users/preferences.js';
export const transactionTypes = ['INCOME', 'EXPENSE'] as const;
export const categoryIcons = [
  'briefcase-business',
  'laptop',
  'shopping-basket',
  'house',
  'tram-front',
  'utensils',
  'train-front',
  'repeat',
  'heart',
  'gift',
  'graduation-cap',
  'wallet',
] as const;
export const decimalPattern = '^(0|[1-9][0-9]{0,15})(\\.[0-9]{1,8})?$';
export const ratePattern = '^(0|[1-9][0-9]{0,11})(\\.[0-9]{1,12})?$';
export const money = z
  .string()
  .regex(
    new RegExp(decimalPattern),
    'Введите десятичную сумму: до 16 целых и 8 дробных знаков',
  );
export const rate = z
  .string()
  .regex(new RegExp(ratePattern), 'Курс: до 12 целых и 12 дробных знаков')
  .refine(
    (v) =>
      !/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(v) || new Prisma.Decimal(v).gt(0),
    'Курс должен быть больше нуля',
  );
export const currency = z
  .string()
  .refine((v) => currencies.includes(v), 'Выберите поддерживаемую валюту');
export const businessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате ГГГГ-ММ-ДД')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00.000Z`);
    return (
      v.slice(0, 4) !== '0000' &&
      Number.isFinite(d.getTime()) &&
      d.toISOString().slice(0, 10) === v
    );
  }, 'Такой календарной даты нет');
export const idSchema = z.string().uuid('Некорректный идентификатор');
export const categorySchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, 'Введите название')
    .max(100, 'Не более 100 символов')
    .refine((v) => !/[\p{Cc}]/u.test(v), 'Управляющие символы запрещены'),
  type: z.enum(transactionTypes),
  icon: z.enum(categoryIcons),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Цвет в формате #RRGGBB'),
});
export const categoryPatch = categorySchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Укажите изменяемые поля');
export const transactionSchema = z.strictObject({
  amount: money.refine(
    (v) =>
      !/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(v) || new Prisma.Decimal(v).gt(0),
    'Сумма должна быть больше нуля',
  ),
  currency,
  exchangeRate: rate.optional(),
  categoryId: idSchema,
  type: z.enum(transactionTypes),
  transactionDate: businessDate,
  description: z
    .string()
    .trim()
    .min(1, 'Введите описание')
    .max(500, 'Не более 500 символов')
    .refine((v) => !/[\p{Cc}]/u.test(v), 'Управляющие символы запрещены'),
});
export const transactionPatch = transactionSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Укажите изменяемые поля');
export const paginationShape = {
  page: z
    .string()
    .regex(/^[1-9]\d{0,6}$/)
    .transform(Number)
    .default(1),
  pageSize: z
    .enum(['10', '25', '50'])
    .transform((v) => Number(v))
    .default(25),
};
export const categoryQuery = z.strictObject({
  ...paginationShape,
  state: z.enum(['all', 'active', 'archived']).default('all'),
});
// Общий набор фильтров списка и экспорта: экспорт использует тот же
// построитель, что список, но без пагинации (ARCHITECTURE §10, §15).
export const transactionFilterShape = {
  search: z.string().trim().max(200).optional(),
  type: z.enum(['ALL', ...transactionTypes]).default('ALL'),
  categoryId: idSchema.optional(),
  dateFrom: businessDate.optional(),
  dateTo: businessDate.optional(),
  amountMin: money.optional(),
  amountMax: money.optional(),
  currency: currency.optional(),
  sort: z
    .enum(['newest', 'oldest', 'amountDesc', 'amountAsc'])
    .default('newest'),
};
function checkTransactionFilterRange(
  v: {
    dateFrom?: string;
    dateTo?: string;
    amountMin?: string;
    amountMax?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (v.dateFrom && v.dateTo && v.dateFrom > v.dateTo)
    ctx.addIssue({
      code: 'custom',
      path: ['dateTo'],
      message: 'Конец периода раньше начала',
    });
  if (
    v.amountMin &&
    v.amountMax &&
    new RegExp(decimalPattern).test(v.amountMin) &&
    new RegExp(decimalPattern).test(v.amountMax) &&
    new Prisma.Decimal(v.amountMin).gt(v.amountMax)
  )
    ctx.addIssue({
      code: 'custom',
      path: ['amountMax'],
      message: 'Максимум меньше минимума',
    });
}
export const transactionQuery = z
  .strictObject({ ...paginationShape, ...transactionFilterShape })
  .superRefine(checkTransactionFilterRange);
export const transactionExportQuery = z
  .strictObject({ ...transactionFilterShape })
  .superRefine(checkTransactionFilterRange);
export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionPatch = z.infer<typeof transactionPatch>;
export type TransactionQuery = z.infer<typeof transactionQuery>;
export type TransactionExportQuery = z.infer<typeof transactionExportQuery>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type CategoryQuery = z.infer<typeof categoryQuery>;
export function invalid(field: string, message: string): never {
  throw new Problem(400, 'validation_error', message, { [field]: [message] });
}
export function currencyDigits(code: string) {
  return (
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: code,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}
