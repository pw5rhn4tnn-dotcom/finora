import type { ComponentProps, ReactNode } from 'react';

export function Card({ className = '', ...props }: ComponentProps<'div'>) {
  return <div className={`card ${className}`} {...props} />;
}

export function Badge({
  tone = 'neutral',
  className = '',
  ...props
}: ComponentProps<'span'> & {
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
}) {
  return <span className={`badge badge--${tone} ${className}`} {...props} />;
}

export function Divider() {
  return <hr className="divider" />;
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="min-w-0">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="page-header__action">{action}</div>}
    </header>
  );
}

export function Section({
  title,
  description,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`section ${className}`}>
      <header>
        <h2>{title}</h2>
        {description && <p className="section__description">{description}</p>}
      </header>
      {children}
    </section>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="page-container">{children}</div>;
}
