import { useRef } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import {
  recurringDelete,
  type RecurringDto,
  type RecurringRemovalDto,
} from '@finora/api-client';
import { Sheet, SheetContent, SheetClose } from '../../shared/ui/Sheet';
import { Button } from '../../shared/ui/Button';
import { safeError } from '../../shared/api/client';
import { useFinancialMutation, unwrap } from './api';
import { RecurringForm } from './RecurringForm';
export type RecurringAction = {
  mode: 'create' | 'edit' | 'delete';
  record?: RecurringDto;
  trigger: HTMLElement;
};
export function RecurringSheet({
  action,
  onClose,
  onSuccess,
}: {
  action: RecurringAction;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const pending = useIsMutating({ mutationKey: ['account-write'] }) > 0;
  const busyRef = useRef(false);
  const restoreFocus = () => {
    if (action.trigger.isConnected) action.trigger.focus();
    else document.getElementById('main-content')?.focus();
  };
  const remove = useFinancialMutation<void, RecurringRemovalDto>(
    async () =>
      unwrap(await recurringDelete(action.record!.id)) as RecurringRemovalDto,
    (result) => {
      onSuccess(
        result.outcome === 'deleted'
          ? 'Правило удалено.'
          : 'Правило архивировано, история сохранена.',
      );
      onClose();
    },
  );
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !pending && !busyRef.current) onClose();
      }}
    >
      {action.mode === 'delete' ? (
        <SheetContent
          title="Удалить регулярное правило?"
          description={
            action.record?.hasGeneratedTransactions
              ? 'Правило уже создавало операции, поэтому будет заархивировано: новые операции больше не появятся, а история и созданные операции сохранятся.'
              : 'Правило ещё не создало ни одной операции, поэтому будет удалено полностью.'
          }
          closeDisabled={pending}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            restoreFocus();
          }}
        >
          <p className="finance-delete-label">{action.record?.description}</p>
          {remove.isError && (
            <p role="alert" className="field__error">
              {safeError(remove.error)}
            </p>
          )}
          <div className="finance-actions">
            <SheetClose asChild>
              <Button variant="secondary" disabled={pending}>
                Отмена
              </Button>
            </SheetClose>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (busyRef.current) return;
                busyRef.current = true;
                remove.mutate(undefined, {
                  onSettled: () => {
                    busyRef.current = false;
                  },
                });
              }}
            >
              {pending ? 'Удаляем…' : 'Подтвердить'}
            </Button>
          </div>
        </SheetContent>
      ) : (
        <RecurringForm
          rule={action.record}
          restoreFocus={restoreFocus}
          close={() => {
            onSuccess(
              action.mode === 'create'
                ? 'Правило создано.'
                : 'Правило изменено.',
            );
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}
