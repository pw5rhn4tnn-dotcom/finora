import type { AuditEntryDto } from '@finora/api-client';
import { Sheet, SheetContent } from '../../shared/ui/Sheet';
import { AuditDiff } from './AuditDiff';
import { actionLabel, entityTypeLabel } from './audit-fields';

export type AuditDetail = { entry: AuditEntryDto; trigger: HTMLElement };
export function AuditDetailSheet({
  detail,
  baseCurrency,
  timeZone,
  onClose,
}: {
  detail: AuditDetail;
  baseCurrency: string;
  timeZone: string;
  onClose: () => void;
}) {
  const restoreFocus = () => {
    if (detail.trigger.isConnected) detail.trigger.focus();
    else document.getElementById('main-content')?.focus();
  };
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        title={`${entityTypeLabel[detail.entry.entityType]} · ${actionLabel[detail.entry.action]}`}
        description="Читаемые изменения записи; неизменяемая история."
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          restoreFocus();
        }}
      >
        <AuditDiff
          entry={detail.entry}
          baseCurrency={baseCurrency}
          timeZone={timeZone}
        />
      </SheetContent>
    </Sheet>
  );
}
