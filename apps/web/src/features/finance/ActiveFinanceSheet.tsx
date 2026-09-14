import { useIsMutating } from '@tanstack/react-query';
import { Sheet } from '../../shared/ui/Sheet';
import { CategoryForm } from './CategoryForm';
import { TransactionForm } from './TransactionForm';
import { DeleteConfirmation } from './DeleteAction';
import type { ActiveAction } from './active-action';
// Диалог принадлежит странице: смена фильтра/порядка не уничтожает черновик.
export function ActiveFinanceSheet({
  action,
  onClose,
  onSuccess,
}: {
  action: ActiveAction | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const pending = useIsMutating({ mutationKey: ['account-write'] }) > 0;
  if (!action) return null;
  const restoreFocus = () => {
    if (action.trigger.isConnected) action.trigger.focus();
    else document.getElementById('main-content')?.focus();
  };
  const saved = (message: string) => {
    onSuccess(message);
    onClose();
  };
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      {action.mode === 'delete' ? (
        <DeleteConfirmation
          id={action.record.id}
          kind={action.kind}
          label={
            action.kind === 'category'
              ? action.record.name
              : action.record.description
          }
          onSuccess={saved}
          restoreFocus={restoreFocus}
        />
      ) : action.kind === 'category' ? (
        <CategoryForm
          category={action.record}
          close={() =>
            saved(
              action.mode === 'create'
                ? 'Категория создана.'
                : 'Категория изменена.',
            )
          }
          restoreFocus={restoreFocus}
        />
      ) : (
        <TransactionForm
          transaction={action.record}
          close={() =>
            saved(
              action.mode === 'create'
                ? 'Операция создана.'
                : 'Операция изменена.',
            )
          }
          restoreFocus={restoreFocus}
        />
      )}
    </Sheet>
  );
}
