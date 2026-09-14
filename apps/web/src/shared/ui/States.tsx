import { CircleAlert, Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type StateProps = { title: string; description: string; action?: ReactNode };

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: StateProps & { icon?: LucideIcon }) {
  return (
    <div className="state">
      <div className="state__icon">
        <Icon aria-hidden="true" />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <div className="state__action">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Не удалось загрузить данные',
  description = 'Попробуйте ещё раз чуть позже.',
  action,
}: Partial<StateProps>) {
  return (
    <div className="state state--error" role="alert">
      <div className="state__icon">
        <CircleAlert aria-hidden="true" />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <div className="state__action">{action}</div>}
    </div>
  );
}

export function Skeleton({
  shape = 'line',
}: {
  shape?: 'line' | 'heading' | 'block';
}) {
  return <div aria-hidden="true" className={`skeleton skeleton--${shape}`} />;
}

export function LoadingState({
  label = 'Загружаем данные…',
}: {
  label?: string;
}) {
  return (
    <div className="loading-state" role="status">
      <span className="sr-only">{label}</span>
      <Skeleton shape="heading" />
      <Skeleton />
      <Skeleton />
      <Skeleton shape="block" />
    </div>
  );
}
