import { useState } from 'react';
import { ActiveFinanceSheet } from '../features/finance/ActiveFinanceSheet';
import type { ActiveAction } from '../features/finance/active-action';
import { useSearchParams } from 'react-router';
import { useAuth } from '../features/auth/auth-context';
import { useCategories } from '../features/finance/api';
import { CategoryMark } from '../features/finance/CategoryMark';
import { Pagination } from '../features/finance/Pagination';
import { PageContainer, PageHeader, Card, Badge } from '../shared/ui/Surface';
import { Select } from '../shared/ui/Field';
import { LoadingState, ErrorState, EmptyState } from '../shared/ui/States';
import { Button } from '../shared/ui/Button';
import { safeError } from '../shared/api/client';
import { z } from 'zod';
const schema = z.object({
  page: z.coerce.number().int().min(1).max(9999999).catch(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(10), z.literal(25), z.literal(50)]))
    .catch(25),
  state: z.enum(['all', 'active', 'archived']).catch('all'),
});
export function CategoriesPage() {
  const user = useAuth().data;
  return user ? <Categories key={user.id} /> : null;
}
function Categories() {
  const [url, setUrl] = useSearchParams();
  const params = schema.parse(Object.fromEntries(url));
  const query = useCategories(params);
  const [notice, setNotice] = useState('');
  const [action, setAction] = useState<ActiveAction | null>(null);
  const addButton = (
    <Button
      onClick={(event) =>
        setAction({
          kind: 'category',
          mode: 'create',
          trigger: event.currentTarget,
        })
      }
    >
      Добавить категорию
    </Button>
  );
  function change(values: Record<string, string | number>) {
    setUrl((current) => {
      const next = new URLSearchParams(current);
      next.set('page', '1');
      for (const [k, v] of Object.entries(values)) next.set(k, String(v));
      return next;
    });
  }
  return (
    <PageContainer>
      <PageHeader
        title="Категории"
        description="Понятная структура доходов и расходов."
        action={addButton}
      />
      <p role="status" className="finance-notice">
        {notice}
      </p>
      <Card className="finance-card">
        <Select
          label="Состояние категорий"
          value={params.state}
          onChange={(e) => change({ state: e.target.value })}
        >
          <option value="all">Все категории</option>
          <option value="active">Активные</option>
          <option value="archived">Архив</option>
        </Select>
      </Card>
      {query.isPending && <LoadingState />}
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
            {query.isFetching ? 'Обновляем категории…' : ''}
          </p>
          {query.data.items.length ? (
            <div className="category-grid">
              {query.data.items.map((c) => (
                <Card key={c.id} className="category-card">
                  <CategoryMark category={c} />
                  <Badge tone={c.type === 'INCOME' ? 'success' : 'neutral'}>
                    {c.type === 'INCOME' ? 'Доход' : 'Расход'}
                  </Badge>
                  <div className="finance-actions">
                    <Button
                      variant="secondary"
                      onClick={(e) =>
                        setAction({
                          kind: 'category',
                          record: c,
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
                        setAction({
                          kind: 'category',
                          record: c,
                          mode: 'delete',
                          trigger: e.currentTarget,
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
              title="Категории не найдены"
              description="Создайте категорию или выберите другое состояние списка."
              action={addButton}
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
      <ActiveFinanceSheet
        action={action}
        onClose={() => setAction(null)}
        onSuccess={setNotice}
      />
    </PageContainer>
  );
}
