import { useEffect } from 'react';
import {
  useForm,
  type FieldValues,
  type DefaultValues,
  type Path,
} from 'react-hook-form';
import { z } from 'zod';
import { ApiError, safeError } from '../../shared/api/client';
export function useFinancialForm<T extends FieldValues>(
  defaults: DefaultValues<T>,
  schema: z.ZodType<T>,
  fields: readonly Path<T>[],
) {
  const form = useForm<T>({ defaultValues: defaults });
  const errors = form.formState.errors;
  const submitting = form.formState.isSubmitting;
  useEffect(() => {
    if (!submitting) {
      const field = fields.find((f) => errors[f]);
      if (field) form.setFocus(field);
    }
  }, [form, errors, fields, submitting]);
  function parse(input: T) {
    form.clearErrors();
    const result = schema.safeParse(input);
    if (result.success) return result.data;
    for (const field of fields) {
      const issue = result.error.issues.find((i) => i.path.join('.') === field);
      if (issue) form.setError(field, { message: issue.message });
    }
    form.setError('root', { message: 'Проверьте отмеченные поля.' });
    return null;
  }
  function showError(error: unknown) {
    form.setError('root', { message: safeError(error) });
    if (error instanceof ApiError)
      for (const field of fields) {
        const message = error.fields[field]?.[0];
        if (message) form.setError(field, { message });
      }
  }
  return { form, parse, showError };
}
export const amountSchema = z
  .string()
  .transform((v) => v.trim().replace(',', '.'))
  .pipe(
    z
      .string()
      .regex(
        /^(0|[1-9][0-9]{0,15})(\.[0-9]{1,8})?$/,
        'Введите положительную сумму',
      )
      .refine((v) => /[1-9]/.test(v), 'Сумма должна быть больше нуля'),
  );
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату')
  .refine((v) => {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Проверьте календарную дату');
