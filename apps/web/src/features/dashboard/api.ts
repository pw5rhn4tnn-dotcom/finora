import { useQuery } from '@tanstack/react-query';
import { dashboardGet, type DashboardGetParams } from '@finora/api-client';
import { useFinanceSession } from '../finance/api';
import { ApiError } from '../../shared/api/client';

export function useDashboard(params: DashboardGetParams, valid: boolean) {
  const { user, guard } = useFinanceSession();
  return useQuery({
    queryKey: ['finance', user?.id, 'dashboard', params],
    enabled: !!user && valid,
    retry: false,
    queryFn: ({ signal }) =>
      guard(async () => {
        const response = await dashboardGet(params, { signal });
        // Даже транспорт, игнорирующий abort, не должен применить поздний 401
        // к новой сессии или вернуть старый снимок после invalidation.
        signal.throwIfAborted();
        if (response.status === 200) return response.data;
        throw new ApiError(response.status, response.data);
      }),
  });
}
