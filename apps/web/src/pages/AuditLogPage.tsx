import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { z } from 'zod';
import type { AuditEntryDto } from '@finora/api-client';
import { useAuth } from '../features/auth/auth-context';
import { useAudit } from '../features/finance/api';
import { AuditList } from '../features/finance/AuditList';
import {
  AuditDetailSheet,
  type AuditDetail,
} from '../features/finance/AuditDetailSheet';
import { Pagination } from '../features/finance/Pagination';
import { PageContainer, PageHeader, Card } from '../shared/ui/Surface';
import { Select, Input } from '../shared/ui/Field';
import { Button } from '../shared/ui/Button';
import { LoadingState, ErrorState, EmptyState } from '../shared/ui/States';
import { safeError } from '../shared/api/client';

const schema = z
  .object({
    page: z.coerce.number().int().min(1).max(9999999).catch(1),
    pageSize: z.coerce
      .number()
      .pipe(z.union([z.literal(10), z.literal(25), z.literal(50)]))
      .catch(25),
    entityType: z
      .enum([
        'ALL',
        'Transaction',
        'Budget',
        'Category',
        'RecurringTransaction',
      ])
      .catch('ALL'),
    action: z
      .enum(['ALL', 'CREATE', 'UPDATE', 'DELETE', 'ARCHIVE'])
      .catch('ALL'),
    dateFrom: z.string().optional().catch(undefined),
    dateTo: z.string().optional().catch(undefined),
  })
  .transform((v) => ({
    ...v,
    dateFrom: v.dateFrom || undefined,
    dateTo: v.dateTo || undefined,
  }));
export function AuditLogPage() {
  const user = useAuth().data;
  return user ? (
    <AuditLog
      key={user.id}
      baseCurrency={user.baseCurrency}
      timeZone={user.timeZone}
    />
  ) : null;
}
function AuditLog({
  baseCurrency,
  timeZone,
}: {
  baseCurrency: string;
  timeZone: string;
}) {
  const [url, setUrl] = useSearchParams();
  const params = schema.parse(Object.fromEntries(url));
  const query = useAudit(params);
  const [detail, setDetail] = useState<AuditDetail | null>(null);
  function change(values: Record<string, string | number>) {
    setUrl((current) => {
      const next = new URLSearchParams(current);
      next.set('page', '1');
      for (const [k, v] of Object.entries(values)) {
        if (v === '') next.delete(k);
        else next.set(k, String(v));
      }
      return next;
    });
  }
  const filtered =
    params.entityType !== 'ALL' ||
    params.action !== 'ALL' ||
    !!params.dateFrom ||
    !!params.dateTo;
  function openDetail(entry: AuditEntryDto, trigger: HTMLElement) {
    setDetail({ entry, trigger });
  }
  return (
    <PageContainer>
      <PageHeader
        title="Журнал изменений"
        description="История изменений ваших данных: кто/когда — всегда вы, что изменилось — читаемым текстом."
      />
      <Card className="finance-card">
        <fieldset className="finance-filter-fields">
          <legend className="sr-only">Фильтры журнала</legend>
          <Select
            label="Тип сущности"
            value={params.entityType}
            onChange={(e) => change({ entityType: e.target.value })}
          >
            <option value="ALL">Все типы</option>
            <option value="Transaction">Операции</option>
            <option value="Budget">Бюджеты</option>
            <option value="Category">Категории</option>
            <option value="RecurringTransaction">Регулярные правила</option>
          </Select>
          <Select
            label="Действие"
            value={params.action}
            onChange={(e) => change({ action: e.target.value })}
          >
            <option value="ALL">Любое действие</option>
            <option value="CREATE">Создание</option>
            <option value="UPDATE">Изменение</option>
            <option value="ARCHIVE">Архивирование</option>
            <option value="DELETE">Удаление</option>
          </Select>
          <Input
            label="Дата от"
            type="date"
            value={params.dateFrom ?? ''}
            onChange={(e) => change({ dateFrom: e.target.value })}
          />
          <Input
            label="Дата до"
            type="date"
            value={params.dateTo ?? ''}
            onChange={(e) => change({ dateTo: e.target.value })}
          />
        </fieldset>
        {filtered && (
          <Button variant="ghost" onClick={() => setUrl({})}>
            Сбросить фильтры
          </Button>
        )}
      </Card>
      {query.isPending && <LoadingState label="Загружаем журнал…" />}
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
            {query.isFetching ? 'Обновляем журнал…' : ''}
          </p>
          <Card>
            {query.data.items.length ? (
              <AuditList
                items={query.data.items}
                timeZone={timeZone}
                onOpen={openDetail}
              />
            ) : (
              <EmptyState
                title={
                  filtered
                    ? 'По выбранным фильтрам ничего не найдено'
                    : 'Пока нет записей журнала'
                }
                description={
                  filtered
                    ? 'Измените параметры поиска или сбросьте фильтры.'
                    : 'Записи появятся после первого изменения ваших данных.'
                }
                action={
                  filtered ? (
                    <Button onClick={() => setUrl({})}>Сбросить фильтры</Button>
                  ) : undefined
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
      {detail && (
        <AuditDetailSheet
          detail={detail}
          baseCurrency={baseCurrency}
          timeZone={timeZone}
          onClose={() => setDetail(null)}
        />
      )}
    </PageContainer>
  );
}
