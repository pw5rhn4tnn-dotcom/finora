import {
  getTransactionsExportUrl,
  type TransactionsListParams,
} from '@finora/api-client';

// Экспорт возвращает CSV, а не JSON: generated client не умеет читать такой
// ответ (JSON.parse тела), поэтому используется обычная навигация по ссылке
// с Content-Disposition: attachment вместо fetch-обёртки generated client.
export function exportHref(params: TransactionsListParams): string {
  return getTransactionsExportUrl({
    search: params.search,
    type: params.type,
    categoryId: params.categoryId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    amountMin: params.amountMin,
    amountMax: params.amountMax,
    currency: params.currency,
    sort: params.sort,
  });
}
