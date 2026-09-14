import { z } from 'zod';
import { idSchema, money, paginationShape } from '../finance/validation.js';

export const budgetSchema = z.strictObject({
  categoryId: idSchema,
  year: z.number().int().min(1).max(9999),
  month: z.number().int().min(1).max(12),
  limitAmount: money.refine(
    (v) => /[1-9]/.test(v),
    'Лимит должен быть больше нуля',
  ),
});
export const budgetPatch = budgetSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Укажите изменяемые поля');
export const budgetQuery = z.strictObject({
  ...paginationShape,
  year: z
    .string()
    .regex(/^[1-9]\d{0,3}$/)
    .transform(Number),
  month: z
    .string()
    .regex(/^(?:[1-9]|1[0-2])$/)
    .transform(Number),
});
export type BudgetInput = z.infer<typeof budgetSchema>;
export type BudgetPatch = z.infer<typeof budgetPatch>;
export type BudgetQuery = z.infer<typeof budgetQuery>;

// UTC — только носитель DATE для Prisma. setUTCFullYear поддерживает годы 1–99.
export function monthRange(year: number, month: number) {
  const start = new Date(0);
  start.setUTCFullYear(year, month - 1, 1);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { gte: start, lt: end };
}
