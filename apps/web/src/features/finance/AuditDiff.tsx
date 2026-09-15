import type { AuditEntryDto } from '@finora/api-client';
import { actionLabel, auditRows, entityTypeLabel } from './audit-fields';
import { dateTimeText } from './format';

export function AuditDiff({
  entry,
  baseCurrency,
  timeZone,
}: {
  entry: AuditEntryDto;
  baseCurrency: string;
  timeZone: string;
}) {
  const rows = auditRows(entry, baseCurrency);
  return (
    <div className="audit-diff">
      <p className="audit-diff__meta">
        {entityTypeLabel[entry.entityType]} · {actionLabel[entry.action]} ·{' '}
        {dateTimeText(entry.createdAt, timeZone)}
      </p>
      {rows.length ? (
        <dl className="audit-diff__list">
          {rows.map((row) => (
            <div className="audit-diff__row" key={row.label}>
              <dt>{row.label}</dt>
              <dd>
                {row.before !== undefined && row.after !== undefined ? (
                  <>
                    <span className="audit-diff__before">{row.before}</span>
                    {' → '}
                    <span className="audit-diff__after">{row.after}</span>
                  </>
                ) : (
                  <span className="audit-diff__after">
                    {row.after ?? row.before}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>Нет отображаемых изменений полей для этой записи.</p>
      )}
    </div>
  );
}
