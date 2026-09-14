import { useState } from 'react';
import { ActiveFinanceSheet } from '../features/finance/ActiveFinanceSheet';
import type { ActiveAction } from '../features/finance/active-action';
import { useAuth } from '../features/auth/auth-context';
import { useTransactions } from '../features/finance/api';
import { TransactionFilters } from '../features/finance/TransactionFilters';
import { useExplorerParams } from '../features/finance/explorer-params';
import { TransactionList } from '../features/finance/TransactionList';
import { Pagination } from '../features/finance/Pagination';
import { PageContainer, PageHeader, Card } from '../shared/ui/Surface';
import { LoadingState, ErrorState, EmptyState } from '../shared/ui/States';
import { Button } from '../shared/ui/Button';
import { safeError } from '../shared/api/client';
export function TransactionsPage() {
  const user = useAuth().data;
  return user ? (
    <Explorer key={user.id} baseCurrency={user.baseCurrency} />
  ) : null;
}
function Explorer({ baseCurrency }: { baseCurrency: string }) {
  const { params, change, reset, searchParams } = useExplorerParams();
  const query = useTransactions(params);
  const [notice, setNotice] = useState('');
  const [action, setAction] = useState<ActiveAction | null>(null);
  const addButton = (
    <Button
      onClick={(event) =>
        setAction({
          kind: 'transaction',
          mode: 'create',
          trigger: event.currentTarget,
        })
      }
    >
      Добавить операцию
    </Button>
  );
  const filtered = [
    'search',
    'type',
    'categoryId',
    'dateFrom',
    'dateTo',
    'amountMin',
    'amountMax',
    'currency',
  ].some((k) => !!searchParams.get(k) && searchParams.get(k) !== 'ALL');
  return (
    <PageContainer>
      <PageHeader
        title="Транзакции"
        description="История доходов и расходов в одном месте."
        action={addButton}
      />
      <p role="status" className="finance-notice">
        {notice}
      </p>
      <Card className="finance-card">
        <TransactionFilters baseCurrency={baseCurrency} />
      </Card>
      {query.isPending && <LoadingState label="Загружаем операции…" />}
      {query.isError && (
        <ErrorState
          description={safeError(query.error)}
          action={
            <Button
              onClick={() => {
                void query.refetch();
              }}
            >
              Повторить
            </Button>
          }
        />
      )}
      {query.data && (
        <>
          <p role="status" className="finance-progress">
            {query.isFetching ? 'Обновляем операции…' : ''}
          </p>
          <Card>
            {query.data.items.length ? (
              <TransactionList
                items={query.data.items}
                baseCurrency={baseCurrency}
                onAction={setAction}
              />
            ) : (
              <EmptyState
                title={
                  filtered
                    ? 'По выбранным фильтрам ничего не найдено.'
                    : 'Пока нет операций'
                }
                description={
                  filtered
                    ? 'Измените параметры поиска или сбросьте фильтры.'
                    : 'Добавьте доход или расход, чтобы начать вести историю.'
                }
                action={
                  filtered ? (
                    <Button onClick={reset}>Сбросить фильтры</Button>
                  ) : (
                    addButton
                  )
                }
              />
            )}
          </Card>
          <Pagination
            page={query.data.page}
            pageSize={query.data.pageSize}
            total={query.data.total}
            pending={query.isFetching}
            onPage={(page) => change({ page })}
            onPageSize={(pageSize) => change({ pageSize })}
          />
        </>
      )}
      <ActiveFinanceSheet
        action={action}
        onClose={() => setAction(null)}
        onSuccess={setNotice}
      />
    </PageContainer>
  );
}
