import { ApiProperty, PickType } from '@nestjs/swagger';
import { BudgetDto, BudgetQueryDto } from '../budgets/budgets.dto.js';
import { CategoryDto } from '../finance/finance.dto.js';

export class DashboardQueryDto extends PickType(BudgetQueryDto, [
  'year',
  'month',
] as const) {}
export class DashboardTotalsDto {
  @ApiProperty({
    description: 'Доходы в основной валюте, точная десятичная строка',
  })
  income!: string;
  @ApiProperty({
    description: 'Расходы в основной валюте, точная десятичная строка',
  })
  expense!: string;
  @ApiProperty({
    description: 'Доходы минус расходы, может быть отрицательным',
  })
  net!: string;
  @ApiProperty({
    description:
      '(Доходы − расходы) / доходы × 100, HALF_UP до 2 знаков; null при нулевом доходе',
    type: String,
    nullable: true,
  })
  savingsRate!: string | null;
  @ApiProperty({ description: 'Есть хотя бы одна операция в этом месяце' })
  hasTransactions!: boolean;
}
export class DashboardMonthDto extends DashboardTotalsDto {
  @ApiProperty({ description: 'Календарный год' }) year!: number;
  @ApiProperty({ description: 'Календарный месяц 1–12' }) month!: number;
}
export class DashboardCategoryDto {
  @ApiProperty({
    description: 'Собственная категория, включая архивную',
    type: CategoryDto,
  })
  category!: CategoryDto;
  @ApiProperty({ description: 'Сумма расходов в основной валюте' })
  amount!: string;
  @ApiProperty({
    description: 'Доля расходов в процентах, HALF_UP до 2 знаков',
  })
  share!: string;
}
export const insightCodes = [
  'BUDGET_OVER',
  'BUDGET_NEAR',
  'EXPENSE_UP',
  'SAVINGS_DOWN',
  'SAVINGS_UP',
  'EXPENSE_DOWN',
  'LARGEST_CATEGORY',
] as const;
export class DashboardInsightDto {
  @ApiProperty({ description: 'Стабильный код правила', enum: insightCodes })
  code!: (typeof insightCodes)[number];
  @ApiProperty({ description: 'Краткий вывод' }) title!: string;
  @ApiProperty({
    description:
      'Наблюдение на основе выбранного и предыдущего календарных месяцев; не прогноз',
  })
  description!: string;
}
export class DashboardUpcomingRecurringDto {
  @ApiProperty({ description: 'Идентификатор правила', format: 'uuid' })
  id!: string;
  @ApiProperty({
    description: 'Категория, включая архивную',
    type: CategoryDto,
  })
  category!: CategoryDto;
  @ApiProperty({ description: 'Тип операции', enum: ['INCOME', 'EXPENSE'] })
  type!: 'INCOME' | 'EXPENSE';
  @ApiProperty({ description: 'Сумма шаблона' }) amount!: string;
  @ApiProperty({ description: 'Валюта шаблона' }) currency!: string;
  @ApiProperty({ description: 'Описание' }) description!: string;
  @ApiProperty({
    description: 'Ближайшая дата occurrence',
    format: 'date',
  })
  nextOccurrenceDate!: string;
}
export class DashboardDto extends DashboardMonthDto {
  @ApiProperty({
    description: 'Основная валюта владельца из того же снимка БД',
  })
  currency!: string;
  @ApiProperty({
    description:
      'Шесть месяцев по возрастанию: выбранный и пять предыдущих; отсутствующие месяцы заполнены нулями',
    type: [DashboardMonthDto],
  })
  trend!: DashboardMonthDto[];
  @ApiProperty({
    description: 'Все категории расходов; сумма DESC, UUID ASC при равенстве',
    type: [DashboardCategoryDto],
  })
  distribution!: DashboardCategoryDto[];
  @ApiProperty({
    description: 'Первые пять категорий того же распределения',
    type: [DashboardCategoryDto],
  })
  topCategories!: DashboardCategoryDto[];
  @ApiProperty({
    description:
      'Все собственные бюджеты выбранного месяца с семантикой Stage 6, UUID ASC',
    type: [BudgetDto],
  })
  budgets!: BudgetDto[];
  @ApiProperty({
    description:
      'До четырёх детерминированных наблюдений по приоритету; пусто при недостатке данных',
    type: [DashboardInsightDto],
  })
  insights!: DashboardInsightDto[];
  @ApiProperty({
    description:
      'До пяти ближайших активных recurring правил по возрастанию nextOccurrenceDate; не зависит от выбранного месяца',
    type: [DashboardUpcomingRecurringDto],
  })
  upcomingRecurring!: DashboardUpcomingRecurringDto[];
}
