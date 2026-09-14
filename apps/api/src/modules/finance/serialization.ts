import type {
  Category,
  Transaction,
  RecurringTransaction,
} from '../../generated/prisma/client.js';
export function categoryView(c: Category) {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    icon: c.icon,
    color: c.color,
    archivedAt: c.archivedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}
export function transactionView(t: Transaction & { category: Category }) {
  return {
    id: t.id,
    categoryId: t.categoryId,
    category: categoryView(t.category),
    type: t.type,
    amount: t.amount.toFixed(),
    currency: t.currency,
    exchangeRate: t.exchangeRate.toFixed(),
    amountInBaseCurrency: t.amountInBaseCurrency.toFixed(),
    description: t.description,
    transactionDate: t.transactionDate.toISOString().slice(0, 10),
    source: t.source,
    recurringTransactionId: t.recurringTransactionId,
    recurringOccurrenceDate:
      t.recurringOccurrenceDate?.toISOString().slice(0, 10) ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
export function transactionSnapshot(t: Transaction & { category: Category }) {
  const { category, ...data } = transactionView(t);
  return { ...data, userId: t.userId, categoryName: category.name };
}
export function recurringSnapshot(
  r: RecurringTransaction,
  categoryName: string,
) {
  return {
    id: r.id,
    userId: r.userId,
    categoryId: r.categoryId,
    categoryName,
    type: r.type,
    amount: r.amount.toFixed(),
    currency: r.currency,
    exchangeRate: r.exchangeRate.toFixed(),
    description: r.description,
    frequency: r.frequency,
    dayOfMonth: r.dayOfMonth,
    startDate: r.startDate.toISOString().slice(0, 10),
    endDate: r.endDate?.toISOString().slice(0, 10) ?? null,
    nextOccurrenceDate: r.nextOccurrenceDate.toISOString().slice(0, 10),
    archivedAt: r.archivedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
