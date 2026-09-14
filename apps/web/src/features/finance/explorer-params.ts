import { useSearchParams } from 'react-router';
import {
  TransactionsListSort,
  TransactionsListType,
  type TransactionsListParams,
} from '@finora/api-client';
import { z } from 'zod';
const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(9999999).catch(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(10), z.literal(25), z.literal(50)]))
    .catch(25),
  type: z.enum(TransactionsListType).optional().catch(undefined),
  sort: z.enum(TransactionsListSort).optional().catch(undefined),
});
export function useExplorerParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = querySchema.parse(Object.fromEntries(searchParams));
  const params: TransactionsListParams = {
    ...parsed,
    ...Object.fromEntries(
      [
        'search',
        'categoryId',
        'dateFrom',
        'dateTo',
        'amountMin',
        'amountMax',
        'currency',
      ].flatMap((key) =>
        searchParams.get(key) ? [[key, searchParams.get(key)!]] : [],
      ),
    ),
  };
  function change(values: Record<string, string | number>) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('page', '1');
      for (const [key, value] of Object.entries(values)) {
        if (value === '') next.delete(key);
        else next.set(key, String(value));
      }
      return next;
    });
  }
  return { params, change, reset: () => setSearchParams({}), searchParams };
}
