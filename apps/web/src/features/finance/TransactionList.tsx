import type { TransactionDto } from '@finora/api-client';
import { CategoryMark } from './CategoryMark';
import { Button } from '../../shared/ui/Button';
import type { ActiveAction } from './active-action';
import { dateText, moneyText } from './format';
export function TransactionList({
  items,
  baseCurrency,
  onAction,
}: {
  items: TransactionDto[];
  baseCurrency: string;
  onAction: (action: ActiveAction) => void;
}) {
  return (
    <div className="transaction-table" role="table" aria-label="Операции">
      <div className="transaction-table__head" role="row">
        <span role="columnheader">Операция</span>
        <span role="columnheader">Категория</span>
        <span role="columnheader">Сумма</span>
        <span role="columnheader">Действия</span>
      </div>
      {items.map((t) => (
        <div className="transaction-row" role="row" key={t.id}>
          <div role="cell">
            <p className="transaction-description">{t.description}</p>
            <p className="transaction-date">
              {dateText(t.transactionDate)} ·{' '}
              {t.type === 'INCOME' ? 'Доход' : 'Расход'}
            </p>
          </div>
          <div role="cell">
            <CategoryMark category={t.category} />
          </div>
          <div role="cell" className="transaction-amount">
            <strong
              className={`numeric ${t.type === 'INCOME' ? 'finance-income' : 'finance-expense'}`}
            >
              {t.type === 'INCOME' ? '+' : '−'}
              {moneyText(t.amount, t.currency)}
            </strong>
            {t.currency !== baseCurrency && (
              <small className="numeric">
                {moneyText(t.amountInBaseCurrency, baseCurrency)} · курс{' '}
                {t.exchangeRate}
              </small>
            )}
          </div>
          <div role="cell" className="finance-actions">
            <Button
              variant="secondary"
              onClick={(e) =>
                onAction({
                  kind: 'transaction',
                  record: t,
                  mode: 'edit',
                  trigger: e.currentTarget,
                })
              }
            >
              Изменить
            </Button>
            <Button
              variant="danger"
              onClick={(e) =>
                onAction({
                  kind: 'transaction',
                  record: t,
                  mode: 'delete',
                  trigger: e.currentTarget,
                })
              }
            >
              Удалить
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
