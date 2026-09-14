import { useRef } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { budgetsDelete, type BudgetDto } from '@finora/api-client';
import { Sheet, SheetContent, SheetClose } from '../../shared/ui/Sheet';
import { Button } from '../../shared/ui/Button';
import { safeError } from '../../shared/api/client';
import { useFinancialMutation, unwrap } from './api';
import { BudgetForm } from './BudgetForm';
export type BudgetAction = {
  mode: 'create' | 'edit' | 'delete';
  record?: BudgetDto;
  trigger: HTMLElement;
  year: number;
  month: number;
};
export function BudgetSheet({
  action,
  onClose,
  onSuccess,
}: {
  action: BudgetAction;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const pending = useIsMutating({ mutationKey: ['account-write'] }) > 0;
  const busyRef = useRef(false);
  const saved = (message: string) => {
    onSuccess(message);
    onClose();
  };
  const remove = useFinancialMutation(
    async () => unwrap(await budgetsDelete(action.record!.id)),
    () => saved('Бюджет удалён.'),
  );
  const restoreFocus = () => {
    if (action.trigger.isConnected) action.trigger.focus();
    else document.getElementById('main-content')?.focus();
  };
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !pending && !busyRef.current) onClose();
      }}
    >
      {action.mode === 'delete' ? (
        <SheetContent
          title="Удалить бюджет?"
          description="Лимит будет удалён. Операции и запись в журнале изменений сохранятся."
          closeDisabled={pending}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            restoreFocus();
          }}
        >
          <p className="finance-delete-label">{action.record?.category.name}</p>
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
              {pending ? 'Удаляем…' : 'Подтвердить удаление'}
            </Button>
          </div>
        </SheetContent>
      ) : (
        <BudgetForm
          submissionLockRef={busyRef}
          budget={action.record}
          year={action.year}
          month={action.month}
          restoreFocus={restoreFocus}
          close={() =>
            saved(
              action.mode === 'create' ? 'Бюджет создан.' : 'Бюджет изменён.',
            )
          }
        />
      )}
    </Sheet>
  );
}
