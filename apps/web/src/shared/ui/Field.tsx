import { useId, type ComponentProps, type ReactNode } from 'react';

type FieldProps = { label: string; hint?: string; error?: string };

function useField({
  id,
  hint,
  error,
  describedBy,
}: {
  id?: string;
  hint?: string;
  error?: string;
  describedBy?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  return {
    fieldId,
    describedBy:
      [describedBy, hint && `${fieldId}-hint`, error && `${fieldId}-error`]
        .filter(Boolean)
        .join(' ') || undefined,
  };
}

function FieldLayout({
  label,
  hint,
  error,
  fieldId,
  children,
}: FieldProps & { fieldId: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      {children}
      {hint && (
        <p id={`${fieldId}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({
  label,
  hint,
  error,
  id,
  className = '',
  'aria-describedby': describedBy,
  ...props
}: ComponentProps<'input'> & FieldProps) {
  const field = useField({ id, hint, error, describedBy });
  return (
    <FieldLayout
      label={label}
      hint={hint}
      error={error}
      fieldId={field.fieldId}
    >
      <input
        {...props}
        id={field.fieldId}
        aria-describedby={field.describedBy}
        aria-invalid={error ? true : props['aria-invalid']}
        className={`input ${className}`}
      />
    </FieldLayout>
  );
}

export function Select({
  label,
  hint,
  error,
  id,
  className = '',
  'aria-describedby': describedBy,
  ...props
}: ComponentProps<'select'> & FieldProps) {
  const field = useField({ id, hint, error, describedBy });
  return (
    <FieldLayout
      label={label}
      hint={hint}
      error={error}
      fieldId={field.fieldId}
    >
      <select
        {...props}
        id={field.fieldId}
        aria-describedby={field.describedBy}
        aria-invalid={error ? true : props['aria-invalid']}
        className={`input ${className}`}
      />
    </FieldLayout>
  );
}

export function FilterBar({
  children,
  label = 'Фильтры',
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <fieldset className="filter-bar">
      <legend className="sr-only">{label}</legend>
      {children}
    </fieldset>
  );
}
