import type { DashboardDto } from '@finora/api-client';
// Явная fixture только для изолированных component/shell тестов.
export function dashboardFixture(
  year = 2026,
  month = 9,
  overrides: Partial<DashboardDto> = {},
): DashboardDto {
  const empty = {
    income: '0',
    expense: '0',
    net: '0',
    savingsRate: null,
    hasTransactions: false,
  };
  return {
    year,
    month,
    ...empty,
    currency: 'RUB',
    distribution: [],
    topCategories: [],
    budgets: [],
    insights: [],
    upcomingRecurring: [],
    trend: Array.from({ length: 6 }, (_, i) => {
      const index = year * 12 + month - 6 + i;
      return {
        year: Math.floor(index / 12),
        month: (index % 12) + 1,
        ...empty,
      };
    }),
    ...overrides,
  };
}
