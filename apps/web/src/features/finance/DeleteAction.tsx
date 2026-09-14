import { categoriesDelete, transactionsDelete } from '@finora/api-client';
import { Button } from '../../shared/ui/Button';
import { SheetContent, SheetClose } from '../../shared/ui/Sheet';
import { safeError } from '../../shared/api/client';
import { useFinancialMutation } from './api';
export function DeleteConfirmation({
  id,
  kind,
  label,
  onSuccess,
  restoreFocus,
}: {
  id: string;
  kind: 'category' | 'transaction';
  label: string;
  onSuccess: (message: string) => void;
  restoreFocus: () => void;
}) {
  const remove = useFinancialMutation(
    async () => {
      if (kind === 'transaction') {
        const r = await transactionsDelete(id);
        if (r.status !== 204) throw new ErrorResponse(r.status, r.data);
        return 'deleted' as const;
      }
      const r = await categoriesDelete(id);
      if (r.status !== 200) throw new ErrorResponse(r.status, r.data);
      return r.data.outcome;
    },
    (outcome) => {
      onSuccess(
        kind === 'category'
          ? outcome === 'archived'
            ? 'Категория перенесена в архив.'
            : 'Категория удалена.'
          : 'Операция удалена.',
      );
    },
  );
  return (
    <SheetContent
      title={kind === 'category' ? 'Удалить категорию?' : 'Удалить операцию?'}
      description={
        kind === 'category'
          ? 'Неиспользованная категория будет удалена. Используемая — перенесена в архив вместе с активными регулярными правилами. История сохранится.'
          : 'Операция будет удалена. Запись в журнале изменений сохранится.'
      }
      closeDisabled={remove.isPending}
      onCloseAutoFocus={(e) => {
        e.preventDefault();
        restoreFocus();
      }}
    >
      <p className="finance-delete-label">{label}</p>
      {remove.isError && (
        <p className="field__error" role="alert">
          {safeError(remove.error)}
        </p>
      )}
      <div className="finance-actions">
        <SheetClose asChild>
          <Button variant="secondary" disabled={remove.isPending}>
            Отмена
          </Button>
        </SheetClose>
        <Button
          variant="danger"
          disabled={remove.isPending}
          onClick={() => {
            if (!remove.isPending) remove.mutate();
          }}
        >
          {remove.isPending ? 'Удаляем…' : 'Подтвердить удаление'}
        </Button>
      </div>
      <p role="status">{remove.isPending ? 'Сохраняем изменение…' : ''}</p>
    </SheetContent>
  );
}
import { ApiError as ErrorResponse } from '../../shared/api/client';
