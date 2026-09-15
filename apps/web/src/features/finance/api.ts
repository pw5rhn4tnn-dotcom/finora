import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  categoriesList,
  categoriesOptions,
  transactionsList,
  recurringList,
  auditList,
  type CategoriesListParams,
  type TransactionsListParams,
  type RecurringListParams,
  type AuditListParams,
  type UserDto,
} from '@finora/api-client';
import { useAuth, sessionKey, replaceSession } from '../auth/auth-context';
import { ApiError } from '../../shared/api/client';
// Единственная HTTP-граница — generated Orval functions. Проверка статуса общая.
export function unwrap(response: { status: number; data: unknown }): unknown {
  if (response.status >= 200 && response.status < 300) return response.data;
  throw new ApiError(response.status, response.data);
}
export function useFinanceSession() {
  const user = useAuth().data;
  const client = useQueryClient();
  const userId = user?.id;
  const guard = useCallback(
    async <T>(operation: () => Promise<T>) => {
      try {
        return await operation();
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          client.getQueryData<UserDto | null>(sessionKey)?.id === userId
        )
          await replaceSession(client, null);
        throw error;
      }
    },
    [client, userId],
  );
  return { user, client, guard };
}
export function useCategories(params: CategoriesListParams) {
  const { user, guard } = useFinanceSession();
  return useQuery({
    queryKey: ['finance', user?.id, 'categories', params],
    queryFn: ({ signal }) =>
      guard(async () => {
        const r = await categoriesList(params, { signal });
        if (r.status === 200) return r.data;
        throw new ApiError(r.status, r.data);
      }),
    retry: false,
  });
}
export function useCategoryOptions() {
  const { user, guard } = useFinanceSession();
  return useQuery({
    queryKey: ['finance', user?.id, 'category-options'],
    queryFn: ({ signal }) =>
      guard(async () => {
        const r = await categoriesOptions({ signal });
        if (r.status === 200) return r.data;
        throw new ApiError(r.status, r.data);
      }),
    retry: false,
  });
}
export function useTransactions(params: TransactionsListParams) {
  const { user, guard } = useFinanceSession();
  return useQuery({
    queryKey: ['finance', user?.id, 'transactions', params],
    queryFn: ({ signal }) =>
      guard(async () => {
        const r = await transactionsList(params, { signal });
        if (r.status === 200) return r.data;
        throw new ApiError(r.status, r.data);
      }),
    retry: false,
  });
}
export function useRecurring(params: RecurringListParams) {
  const { user, guard } = useFinanceSession();
  return useQuery({
    queryKey: ['finance', user?.id, 'recurring', params],
    queryFn: ({ signal }) =>
      guard(async () => {
        const r = await recurringList(params, { signal });
        if (r.status === 200) return r.data;
        throw new ApiError(r.status, r.data);
      }),
    retry: false,
  });
}
export function useAudit(params: AuditListParams) {
  const { user, guard } = useFinanceSession();
  return useQuery({
    queryKey: ['finance', user?.id, 'audit-log', params],
    queryFn: ({ signal }) =>
      guard(async () => {
        const r = await auditList(params, { signal });
        if (r.status === 200) return r.data;
        throw new ApiError(r.status, r.data);
      }),
    retry: false,
  });
}
export function useFinancialMutation<T, R = unknown>(
  operation: (input: T) => Promise<R>,
  onSuccess: (result: R) => void,
) {
  const { user, client, guard } = useFinanceSession();
  return useMutation({
    mutationKey: ['account-write'],
    mutationFn: (input: T) => guard(() => operation(input)),
    retry: false,
    onSuccess: async (result) => {
      if (client.getQueryData<UserDto | null>(sessionKey)?.id !== user?.id)
        return;
      // Первый GET нового фильтра ещё не имеет data. invalidateQueries в этом
      // случае присоединяется к старому запросу вместо его отмены: snapshot до
      // мутации мог бы вернуть уже удалённую строку. Сначала отменяем все чтения
      // владельца, затем обязательно запрашиваем данные после server success.
      await client.cancelQueries({ queryKey: ['finance', user?.id] });
      await client.invalidateQueries({ queryKey: ['finance', user?.id] });
      await client.invalidateQueries({ queryKey: sessionKey });
      if (client.getQueryData<UserDto | null>(sessionKey)?.id === user?.id)
        onSuccess(result);
    },
  });
}
