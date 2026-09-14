import type { CategoryDto, TransactionDto } from '@finora/api-client';
export type ActiveAction = { trigger: HTMLButtonElement } & (
  | { mode: 'create'; kind: 'category' | 'transaction'; record?: never }
  | ({ mode: 'edit' | 'delete' } & (
      | { kind: 'category'; record: CategoryDto }
      | { kind: 'transaction'; record: TransactionDto }
    ))
);
