import { Prisma } from '../../generated/prisma/client.js';
import { budgetQuery, monthRange } from '../budgets/budgets.validation.js';
import type {
  DashboardDto,
  DashboardInsightDto,
  DashboardTotalsDto,
} from './dashboard.dto.js';

export const Decimal = Prisma.Decimal.clone({
  precision: 60,
  rounding: Prisma.Decimal.ROUND_HALF_UP,
});
export const dashboardQuery = budgetQuery
  .pick({ year: true, month: true })
  .refine((q) => q.year > 1 || q.month >= 6, {
    path: ['month'],
    message: 'Полное окно из шести месяцев доступно с 0001-06',
  });
export function dashboardMonths(year: number, month: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const date = monthRange(year, month - 5 + i).gte;
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
  });
}
export function totals(
  income: string,
  expense: string,
  hasTransactions: boolean,
): DashboardTotalsDto {
  const earned = new Decimal(income),
    spent = new Decimal(expense);
  const net = earned.minus(spent);
  return {
    income: earned.toFixed(),
    expense: spent.toFixed(),
    net: net.toFixed(),
    savingsRate: earned.isZero() ? null : net.div(earned).mul(100).toFixed(2),
    hasTransactions,
  };
}
export function insights(
  data: Pick<
    DashboardDto,
    'income' | 'expense' | 'hasTransactions' | 'budgets' | 'distribution'
  >,
  previous: DashboardTotalsDto,
): DashboardInsightDto[] {
  const result: DashboardInsightDto[] = [];
  const over = data.budgets.filter((b) => b.overBudget);
  const near = data.budgets.filter(
    (b) =>
      !b.overBudget &&
      new Decimal(b.spent).gte(new Decimal(b.limitAmount).mul('0.9')),
  );
  if (over.length)
    result.push({
      code: 'BUDGET_OVER',
      title: 'Есть превышение бюджета',
      description: `Бюджетов с превышением лимита в выбранном месяце: ${over.length}. Подробности — в блоке бюджетов.`,
    });
  else if (near.length)
    result.push({
      code: 'BUDGET_NEAR',
      title: 'Лимит бюджета близко',
      description: `Бюджетов с использованием от 90% до 100% лимита включительно: ${near.length}.`,
    });
  // Сравниваем исходные Decimal, а не округлённые проценты из представления.
  const comparable = data.hasTransactions && previous.hasTransactions;
  const oldExpense = new Decimal(previous.expense);
  const change =
    comparable && oldExpense.gt(0)
      ? new Decimal(data.expense).minus(oldExpense).div(oldExpense).mul(100)
      : null;
  if (change?.gte(20))
    result.push({
      code: 'EXPENSE_UP',
      title: 'Расходы выросли',
      description: `На ${change.toFixed(2).replace('.', ',')}% относительно предыдущего календарного месяца.`,
    });
  if (
    comparable &&
    new Decimal(data.income).gt(0) &&
    new Decimal(previous.income).gt(0)
  ) {
    const rate = (income: string, expense: string) =>
      new Decimal(income).minus(expense).div(income).mul(100);
    const delta = rate(data.income, data.expense).minus(
      rate(previous.income, previous.expense),
    );
    if (delta.abs().gte(10))
      result.push({
        code: delta.lt(0) ? 'SAVINGS_DOWN' : 'SAVINGS_UP',
        title: delta.lt(0)
          ? 'Доля сбережений снизилась'
          : 'Доля сбережений выросла',
        description: `На ${delta.abs().toFixed(2).replace('.', ',')} процентного пункта относительно предыдущего календарного месяца.`,
      });
  }
  if (change?.lte(-20))
    result.push({
      code: 'EXPENSE_DOWN',
      title: 'Расходы снизились',
      description: `На ${change.abs().toFixed(2).replace('.', ',')}% относительно предыдущего календарного месяца.`,
    });
  const largest = data.distribution[0];
  if (
    largest &&
    new Decimal(data.expense).gt(0) &&
    new Decimal(largest.amount).gte(new Decimal(data.expense).mul('0.3'))
  )
    result.push({
      code: 'LARGEST_CATEGORY',
      title: 'Основная статья расходов',
      description: `«${largest.category.name}» — ${largest.share.replace('.', ',')}% расходов выбранного месяца.`,
    });
  return result.slice(0, 4);
}
