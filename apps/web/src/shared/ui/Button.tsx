import type { ComponentProps, ReactElement } from 'react';
import { Slot } from '@radix-ui/react-slot';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonProps = ComponentProps<'button'> & { variant?: Variant };

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`button button--${variant} ${className}`}
      {...props}
    />
  );
}

// Ссылка сохраняет семантику ссылки: disabled намеренно не поддерживается.
export function ButtonLink({
  children,
  variant = 'primary',
  className = '',
}: {
  children: ReactElement;
  variant?: Exclude<Variant, 'danger'>;
  className?: string;
}) {
  return (
    <Slot className={`button button--${variant} ${className}`}>{children}</Slot>
  );
}

export function IconButton({
  label,
  className = '',
  variant = 'ghost',
  ...props
}: Omit<ButtonProps, 'aria-label'> & { label: string }) {
  return (
    <Button
      aria-label={label}
      variant={variant}
      className={`icon-button ${className}`}
      {...props}
    />
  );
}
