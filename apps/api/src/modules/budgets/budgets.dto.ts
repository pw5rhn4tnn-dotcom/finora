import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  CategoryDto,
  PageDto,
  PaginationQueryDto,
} from '../finance/finance.dto.js';
import { decimalPattern } from '../finance/validation.js';
export class BudgetInputDto {
  @ApiProperty({
    description:
      'Собственная активная expense-категория; прежняя архивная связь сохраняется при изменении лимита',
    format: 'uuid',
  })
  categoryId!: string;
  @ApiProperty({
    description: 'Календарный год',
    type: 'integer',
    minimum: 1,
    maximum: 9999,
  })
  year!: number;
  @ApiProperty({
    description: 'Календарный месяц',
    type: 'integer',
    minimum: 1,
    maximum: 12,
  })
  month!: number;
  @ApiProperty({
    description:
      'Положительный лимит в основной валюте; точность валюты из /settings/options, максимум 16 целых знаков',
    pattern: decimalPattern,
  })
  limitAmount!: string;
}
export class BudgetPatchDto extends PartialType(BudgetInputDto) {}
export class BudgetQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Год выбранного месяца, обязателен',
    type: 'integer',
    minimum: 1,
    maximum: 9999,
  })
  year!: number;
  @ApiProperty({
    description: 'Месяц 1–12, обязателен; без ведущего нуля',
    type: 'integer',
    minimum: 1,
    maximum: 12,
  })
  month!: number;
}
export class BudgetDto extends BudgetInputDto {
  @ApiProperty({ description: 'Идентификатор бюджета', format: 'uuid' })
  id!: string;
  @ApiProperty({
    description: 'Категория, включая архивную',
    type: CategoryDto,
  })
  category!: CategoryDto;
  @ApiProperty({ description: 'Основная валюта владельца' }) currency!: string;
  @ApiProperty({
    description:
      'Сумма расходов в основной валюте за календарный месяц по DATE; все операции категории, независимо от пагинации',
    pattern: '^\\d+(\\.\\d+)?$',
  })
  spent!: string;
  @ApiProperty({
    description:
      'Лимит минус расходы; отрицательный остаток означает превышение',
    pattern: '^-?\\d+(\\.\\d+)?$',
  })
  remaining!: string;
  @ApiProperty({ description: 'Расходы строго больше лимита' })
  overBudget!: boolean;
  @ApiProperty({
    description:
      'Использование в процентах, строка с 2 знаками HALF_UP; может быть больше 100',
    pattern: '^\\d+\\.\\d{2}$',
  })
  progress!: string;
  @ApiProperty({ description: 'Создан', format: 'date-time' })
  createdAt!: string;
  @ApiProperty({ description: 'Изменён', format: 'date-time' })
  updatedAt!: string;
}
export class BudgetPageDto extends PageDto {
  @ApiProperty({ description: 'Бюджеты выбранного месяца', type: [BudgetDto] })
  items!: BudgetDto[];
}
