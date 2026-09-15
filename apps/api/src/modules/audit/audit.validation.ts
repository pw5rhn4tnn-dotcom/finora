import { z } from 'zod';
import {
  businessDate,
  idSchema,
  paginationShape,
} from '../finance/validation.js';

export const auditEntityTypes = [
  'Transaction',
  'Budget',
  'Category',
  'RecurringTransaction',
] as const;
export const auditActions = ['CREATE', 'UPDATE', 'DELETE', 'ARCHIVE'] as const;

export const auditQuery = z
  .strictObject({
    ...paginationShape,
    entityType: z.enum(['ALL', ...auditEntityTypes]).default('ALL'),
    entityId: idSchema.optional(),
    action: z.enum(['ALL', ...auditActions]).default('ALL'),
    dateFrom: businessDate.optional(),
    dateTo: businessDate.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.dateFrom && v.dateTo && v.dateFrom > v.dateTo)
      ctx.addIssue({
        code: 'custom',
        path: ['dateTo'],
        message: 'Конец периода раньше начала',
      });
  });
export type AuditQuery = z.infer<typeof auditQuery>;
