import { z } from 'zod';
import { Problem } from '../../common/problem.js';

z.config({ customError: () => 'Некорректное значение поля' });

// Каталог из ICU закреплённого Node; не зависит от сети или внешнего FX API.
export const currencies = Intl.supportedValuesOf('currency');
export const timeZones = [
  ...new Set(['UTC', 'Europe/Moscow', ...Intl.supportedValuesOf('timeZone')]),
].sort();
export const profileSchema = z.strictObject({
  displayName: z
    .string()
    .trim()
    .min(1, 'Введите имя')
    .max(100, 'Не более 100 символов')
    .refine(
      (value) => !/[\p{Cc}]/u.test(value),
      'Управляющие символы запрещены',
    ),
  baseCurrency: z
    .string()
    .refine(
      (value) => currencies.includes(value),
      'Выберите поддерживаемую валюту',
    ),
  timeZone: z
    .string()
    .refine((value) => timeZones.includes(value), 'Выберите часовой пояс IANA'),
});
export const loginSchema = z.strictObject({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, 'Не более 254 символов')
    .email('Введите корректный email'),
  password: z
    .string()
    .min(1, 'Введите пароль')
    .max(128, 'Не более 128 символов'),
});
export const registerSchema = loginSchema.extend({
  ...profileSchema.shape,
  password: z
    .string()
    .min(12, 'Не менее 12 символов')
    .max(128, 'Не более 128 символов'),
});
export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || 'form';
    (errors[key] ??= []).push(
      issue.code === 'unrecognized_keys'
        ? 'Неизвестные поля запрещены'
        : issue.message,
    );
  }
  throw new Problem(
    400,
    'validation_error',
    'Проверьте введённые данные',
    errors,
  );
}
