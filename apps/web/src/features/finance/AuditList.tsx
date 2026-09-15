import type { AuditEntryDto } from '@finora/api-client';
import { Badge } from '../../shared/ui/Surface';
import { Button } from '../../shared/ui/Button';
import { actionLabel, entityTypeLabel } from './audit-fields';
import { dateTimeText } from './format';

const tones = {
  CREATE: 'success',
  UPDATE: 'primary',
  ARCHIVE: 'warning',
  DELETE: 'danger',
} as const;
export function AuditList({
  items,
  timeZone,
  onOpen,
}: {
  items: AuditEntryDto[];
  timeZone: string;
  onOpen: (entry: AuditEntryDto, trigger: HTMLElement) => void;
}) {
  return (
    <div
      className="transaction-table"
      role="table"
      aria-label="Журнал изменений"
    >
      <div className="transaction-table__head" role="row">
        <span role="columnheader">Когда</span>
        <span role="columnheader">Сущность</span>
        <span role="columnheader">Действие</span>
        <span role="columnheader">Подробности</span>
      </div>
      {items.map((entry) => (
        <div className="transaction-row" role="row" key={entry.id}>
          <div role="cell">
            <p className="transaction-date">
              {dateTimeText(entry.createdAt, timeZone)}
            </p>
          </div>
          <div role="cell">{entityTypeLabel[entry.entityType]}</div>
          <div role="cell">
            <Badge tone={tones[entry.action]}>
              {actionLabel[entry.action]}
            </Badge>
          </div>
          <div role="cell" className="finance-actions">
            <Button
              variant="secondary"
              onClick={(e) => onOpen(entry, e.currentTarget)}
            >
              Подробнее
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
