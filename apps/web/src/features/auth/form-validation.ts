import { useEffect } from 'react';
import { z } from 'zod';
import type { UseFormReturn } from 'react-hook-form';
import type { AccountFields } from '../profile/PreferenceFields';
import { ApiError, safeError } from '../../shared/api/client';

z.config({ customError: () => 'Некорректное значение поля' });
const fields = [
  'displayName',
  'baseCurrency',
  'timeZone',
  'email',
  'password',
] as const;
const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Не более 254 символов')
  .email('Введите корректный email');
export const loginSchema = z.object({
  email,
  password: z
    .string()
    .min(1, 'Введите пароль')
    .max(128, 'Не более 128 символов'),
});
export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Введите имя')
    .max(100, 'Не более 100 символов')
    .refine(
      (value) => !/[\p{Cc}]/u.test(value),
      'Управляющие символы запрещены',
    ),
  baseCurrency: z.string().min(1, 'Выберите валюту'),
  timeZone: z.string().min(1, 'Выберите часовой пояс'),
});
export const registrationSchema = profileSchema.extend({
  email,
  password: z
    .string()
    .min(12, 'Не менее 12 символов')
    .max(128, 'Не более 128 символов'),
});
export function validateForm<T>(
  form: UseFormReturn<AccountFields>,
  schema: z.ZodType<T>,
  data: unknown,
): T | null {
  form.clearErrors();
  const parsed = schema.safeParse(data);
  if (parsed.success) return parsed.data;
  let focus = true;
  for (const field of fields) {
    const issue = parsed.error.issues.find((issue) => issue.path[0] === field);
    if (issue) {
      form.setError(field, { message: issue.message }, { shouldFocus: focus });
      focus = false;
    }
  }
  form.setError('root', { message: 'Проверьте отмеченные поля.' });
  return null;
}
export function showFormError(
  form: UseFormReturn<AccountFields>,
  error: unknown,
) {
  form.setError('root', { message: safeError(error) });
  if (error instanceof ApiError) {
    let focus = true;
    for (const field of fields) {
      const message = error.fields[field]?.[0];
      if (message) {
        form.setError(field, { message }, { shouldFocus: focus });
        focus = false;
      }
    }
  }
}

export function useFormErrorFocus(
  form: UseFormReturn<AccountFields>,
  pending: boolean,
) {
  const errors = form.formState.errors;
  useEffect(() => {
    if (pending) return;
    const first = fields.find((field) => errors[field]);
    if (first) form.setFocus(first);
  }, [errors, pending, form]);
}
