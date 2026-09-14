import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { z } from 'zod';
import { useAuth } from '../features/auth/auth-context';
import { useRecurring } from '../features/finance/api';
import {
  RecurringSheet,
  type RecurringAction,
} from '../features/finance/RecurringSheet';
import { CategoryMark } from '../features/finance/CategoryMark';
import { Pagination } from '../features/finance/Pagination';
import { dateText, moneyText } from '../features/finance/format';
import { PageContainer, PageHeader, Card, Badge } from '../shared/ui/Surface';
import { Select } from '../shared/ui/Field';
import { Button } from '../shared/ui/Button';
import { LoadingState, ErrorState, EmptyState } from '../shared/ui/States';
import { safeError } from '../shared/api/client';

const schema = z.object({
  page: z.coerce.number().int().min(1).max(9999999).catch(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(10), z.literal(25), z.literal(50)]))
    .catch(25),
  state: z.enum(['all', 'active', 'archived']).catch('all'),
});
export function RecurringPage() {
  const user = useAuth().data;
  return user ? <Recurring key={user.id} /> : null;
}
function Recurring() {
  const [url, setUrl] = useSearchParams();
  const params = schema.parse(Object.fromEntries(url));
  const query = useRecurring(params);
  const [notice, setNotice] = useState('');
  const [action, setAction] = useState<RecurringAction | null>(null);
  function change(values: Record<string, string | number>) {
    setUrl((current) => {
      const next = new URLSearchParams(current);
      next.set('page', '1');
      for (const [k, v] of Object.entries(values)) next.set(k, String(v));
      return next;
    });
  }
  const add = (
    <Button
      onClick={(e) => setAction({ mode: 'create', trigger: e.currentTarget })}
    >
      Добавить правило
    </Button>
  );
  return (
    <PageContainer>
      <PageHeader
        title="Регулярные операции"
        description="Расписание повторяющихся ежемесячных доходов и расходов."
        action={add}
      />
      <p role="status" className="finance-notice">
        {notice}
      </p>
      <Card className="finance-card">
        <Select
          label="Состояние правил"
          value={params.state}
          onChange={(e) => change({ state: e.target.value })}
        >
          <option value="all">Все правила</option>
          <option value="active">Активные</option>
          <option value="archived">Архив</option>
        </Select>
      </Card>
      {query.isPending && <LoadingState label="Загружаем правила…" />}
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
            {query.isFetching ? 'Обновляем правила…' : ''}
          </p>
          {query.data.items.length ? (
            <div className="category-grid">
              {query.data.items.map((rule) => (
                <Card key={rule.id} className="category-card">
                  <CategoryMark category={rule.category} />
                  <p>{rule.description}</p>
                  <p className="numeric">
                    {rule.type === 'INCOME' ? '+' : '−'}
                    {moneyText(rule.amount, rule.currency)}
                  </p>
                  <p>
                    {rule.archivedAt
                      ? `Архивировано ${dateText(rule.nextOccurrenceDate)}`
                      : `Следующая операция: ${dateText(rule.nextOccurrenceDate)}`}
                    {rule.endDate ? ` · до ${dateText(rule.endDate)}` : ''}
                  </p>
                  <Badge tone={rule.archivedAt ? 'neutral' : 'success'}>
                    {rule.archivedAt ? 'Архив' : 'Активно'}
                  </Badge>
                  <div className="finance-actions">
                    <Button
                      variant="secondary"
                      disabled={!!rule.archivedAt}
                      onClick={(e) =>
                        setAction({
                          mode: 'edit',
                          record: rule,
                          trigger: e.currentTarget,
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
                          record: rule,
                          trigger: e.currentTarget,
                        })
                      }
                    >
                      {rule.hasGeneratedTransactions
                        ? 'Архивировать'
                        : 'Удалить'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Регулярных операций не найдено"
              description="Создайте правило или выберите другое состояние списка."
              action={add}
            />
          )}
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
      {action && (
        <RecurringSheet
          action={action}
          onClose={() => setAction(null)}
          onSuccess={setNotice}
        />
      )}
    </PageContainer>
  );
}
