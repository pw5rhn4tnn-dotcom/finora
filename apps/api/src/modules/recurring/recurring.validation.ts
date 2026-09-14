import { z } from 'zod';
import {
  businessDate,
  idSchema,
  money,
  paginationShape,
  rate,
  currency,
  transactionTypes,
} from '../finance/validation.js';

const description = z
  .string()
  .trim()
  .min(1, 'Введите описание')
  .max(500, 'Не более 500 символов')
  .refine((v) => !/[\p{Cc}]/u.test(v), 'Управляющие символы запрещены');
const positiveAmount = money.refine(
  (v) => /[1-9]/.test(v),
  'Сумма должна быть больше нуля',
);

// startDate задаёт и первую occurrence, и dayOfMonth (день startDate);
// отдельного поля для дня месяца в форме создания нет — это минимальная
// непротиворечивая политика, задокументированная в REPORT (Discovery/
// Architecture не разводят startDate и dayOfMonth как независимые поля).
export const recurringSchema = z
  .strictObject({
    amount: positiveAmount,
    currency,
    exchangeRate: rate.optional(),
    categoryId: idSchema,
    type: z.enum(transactionTypes),
    description,
    startDate: businessDate,
    endDate: businessDate.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.endDate && v.endDate < v.startDate)
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'Дата окончания раньше даты начала',
      });
  });
export type RecurringInput = z.infer<typeof recurringSchema>;

// dayOfMonth и endDate редактируемы (расписание); startDate — нет, это
// неизменяемое происхождение правила.
export const recurringPatch = z
  .strictObject({
    amount: positiveAmount.optional(),
    currency: currency.optional(),
    exchangeRate: rate.optional(),
    categoryId: idSchema.optional(),
    type: z.enum(transactionTypes).optional(),
    description: description.optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    endDate: businessDate.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Укажите изменяемые поля');
export type RecurringPatch = z.infer<typeof recurringPatch>;

export const recurringQuery = z.strictObject({
  ...paginationShape,
  state: z.enum(['all', 'active', 'archived']).default('all'),
});
export type RecurringQuery = z.infer<typeof recurringQuery>;
