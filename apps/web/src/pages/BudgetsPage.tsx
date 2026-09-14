import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { budgetsList, type BudgetsListParams } from '@finora/api-client';
import { useAuth } from '../features/auth/auth-context';
import { useFinanceSession } from '../features/finance/api';
import {
  BudgetSheet,
  type BudgetAction,
} from '../features/finance/BudgetSheet';
import { BudgetProgress } from '../features/finance/BudgetProgress';
import { CategoryMark } from '../features/finance/CategoryMark';
import { Pagination } from '../features/finance/Pagination';
import { todayInZone } from '../features/finance/format';
import { PageContainer, PageHeader, Card } from '../shared/ui/Surface';
import { BudgetMonthPicker } from '../features/finance/BudgetMonthPicker';
import { Button } from '../shared/ui/Button';
import { LoadingState, ErrorState, EmptyState } from '../shared/ui/States';
import { ApiError, safeError } from '../shared/api/client';
export function BudgetsPage() {
  const user = useAuth().data;
  return user ? <Budgets key={user.id} /> : null;
}
function Budgets() {
  const { user, guard } = useFinanceSession();
  const [url, setUrl] = useSearchParams();
  const [notice, setNotice] = useState('');
  const [action, setAction] = useState<BudgetAction | null>(null);
  const current = todayInZone(user!.timeZone).slice(0, 7);
  const period = url.get('period') ?? current;
  const valid = /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(period);
  const [year, month] = (valid ? period : current).split('-').map(Number);
  const page = /^[1-9]\d{0,6}$/.test(url.get('page') ?? '')
    ? Number(url.get('page'))
    : 1;
  const pageSize =
    url.get('pageSize') === '10' ? 10 : url.get('pageSize') === '50' ? 50 : 25;
  const params: BudgetsListParams = {
    year: year!,
    month: month!,
    page,
    pageSize,
  };
  const query = useQuery({
    queryKey: ['finance', user!.id, 'budgets', params],
    enabled: valid,
    retry: false,
    queryFn: ({ signal }) =>
      guard(async () => {
        const r = await budgetsList(params, { signal });
        if (r.status === 200) return r.data;
        throw new ApiError(r.status, r.data);
      }),
  });
  function change(values: Record<string, string | number>) {
    setUrl((previous) => {
      const next = new URLSearchParams(previous);
      next.set('page', '1');
      for (const [key, value] of Object.entries(values))
        next.set(key, String(value));
      return next;
    });
  }
  const add = (
    <Button
      disabled={!valid}
      onClick={(e) =>
        setAction({
          mode: 'create',
          trigger: e.currentTarget,
          year: year!,
          month: month!,
        })
      }
    >
      Добавить бюджет
    </Button>
  );
  return (
    <PageContainer>
      <PageHeader
        title="Бюджеты"
        description={`Месячные лимиты и фактические расходы в ${user!.baseCurrency}.`}
        action={add}
      />
      <p role="status" className="finance-notice">
        {notice}
      </p>
      <Card className="finance-card budget-period">
        <BudgetMonthPicker
          value={period}
          onChange={(value) => change({ period: value })}
          error={
            valid ? undefined : 'Укажите месяц в диапазоне 0001-01 — 9999-12'
          }
        />
        <Button variant="secondary" onClick={() => change({ period: current })}>
          Текущий месяц
        </Button>
      </Card>
      {valid && query.isPending && <LoadingState label="Загружаем бюджеты…" />}
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
      {valid && query.data && (
        <>
          <p role="status" className="finance-progress">
            {query.isFetching ? 'Обновляем бюджеты…' : ''}
          </p>
          {query.data.items.length ? (
            <div className="budget-grid">
              {query.data.items.map((budget) => (
                <Card key={budget.id} className="budget-card">
                  <h2>
                    <CategoryMark category={budget.category} />
                  </h2>
                  <BudgetProgress budget={budget} />
                  <div className="finance-actions">
                    <Button
                      variant="secondary"
                      onClick={(e) =>
                        setAction({
                          mode: 'edit',
                          record: budget,
                          trigger: e.currentTarget,
                          year: year!,
                          month: month!,
                        })
                      }
                    >
                      Изменить
                    </Button>
                    <Button
                      variant="danger"
                      onClick={(e) =>
                        setAction({
                          mode: 'delete',
                          record: budget,
                          trigger: e.currentTarget,
                          year: year!,
                          month: month!,
                        })
                      }
                    >
                      Удалить
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title={
                query.data.total
                  ? 'На этой странице бюджетов нет'
                  : 'На этот месяц бюджетов нет'
              }
              description={
                query.data.total
                  ? 'Выберите предыдущую страницу.'
                  : 'Задайте лимит для категории расходов, чтобы следить за его использованием.'
              }
              action={add}
            />
          )}
          <Pagination
            page={query.data.page}
            pageSize={query.data.pageSize}
            total={query.data.total}
            pending={query.isFetching}
            onPage={(value) => change({ page: value })}
            onPageSize={(value) => change({ pageSize: value })}
          />
        </>
      )}
      {action && (
        <BudgetSheet
          action={action}
          onClose={() => setAction(null)}
          onSuccess={setNotice}
        />
      )}
    </PageContainer>
  );
}
