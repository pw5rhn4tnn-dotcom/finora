import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import {
  CategoryDto,
  PageDto,
  PaginationQueryDto,
} from '../finance/finance.dto.js';
import {
  decimalPattern,
  ratePattern,
  transactionTypes,
} from '../finance/validation.js';

export class RecurringInputDto {
  @ApiProperty({
    description: 'Положительная сумма шаблона десятичной строкой',
    pattern: decimalPattern,
  })
  amount!: string;
  @ApiProperty({ description: 'Код валюты из /settings/options' })
  currency!: string;
  @ApiPropertyOptional({
    description:
      'Курс к основной валюте; обязателен для чужой валюты. Для основной валюты равен 1',
    pattern: ratePattern,
  })
  exchangeRate?: string;
  @ApiProperty({
    description: 'Собственная активная категория соответствующего типа',
    format: 'uuid',
  })
  categoryId!: string;
  @ApiProperty({ description: 'Тип операции', enum: transactionTypes }) type!:
    'INCOME' | 'EXPENSE';
  @ApiProperty({
    description: 'Описание, переносится в каждую сгенерированную операцию',
    minLength: 1,
    maxLength: 500,
  })
  description!: string;
  @ApiProperty({
    description:
      'Дата первой occurrence; её календарный день фиксируется как dayOfMonth правила',
    format: 'date',
    example: '2026-10-05',
  })
  startDate!: string;
  @ApiPropertyOptional({
    description: 'Последняя допустимая дата occurrence включительно',
    format: 'date',
  })
  endDate?: string;
}
export class RecurringPatchDto extends PartialType(
  OmitType(RecurringInputDto, ['startDate', 'endDate'] as const),
) {
  @ApiPropertyOptional({
    description:
      'День месяца 1–31; смена приводит к обязательному catch-up по прежнему расписанию перед применением',
    type: 'integer',
    minimum: 1,
    maximum: 31,
  })
  dayOfMonth?: number;
  @ApiPropertyOptional({
    description:
      'Последняя допустимая дата occurrence включительно; null снимает ограничение',
    type: String,
    format: 'date',
    nullable: true,
  })
  endDate?: string | null;
}
export class RecurringDto {
  @ApiProperty({ description: 'Идентификатор правила', format: 'uuid' })
  id!: string;
  @ApiProperty({
    description: 'Категория, включая архивную (после архивирования категории)',
    type: CategoryDto,
  })
  category!: CategoryDto;
  @ApiProperty({ description: 'Тип операции', enum: transactionTypes }) type!:
    'INCOME' | 'EXPENSE';
  @ApiProperty({ description: 'Сумма шаблона', pattern: decimalPattern })
  amount!: string;
  @ApiProperty({ description: 'Валюта шаблона' }) currency!: string;
  @ApiProperty({ description: 'Курс к основной валюте', pattern: ratePattern })
  exchangeRate!: string;
  @ApiProperty({ description: 'Описание' }) description!: string;
  @ApiProperty({ description: 'Частота', enum: ['MONTHLY'] })
  frequency!: 'MONTHLY';
  @ApiProperty({
    description: 'День месяца; при коротком месяце используется последний день',
    type: 'integer',
    minimum: 1,
    maximum: 31,
  })
  dayOfMonth!: number;
  @ApiProperty({ description: 'Дата первой occurrence', format: 'date' })
  startDate!: string;
  @ApiProperty({
    description: 'Последняя допустимая дата occurrence включительно',
    type: String,
    format: 'date',
    nullable: true,
  })
  endDate!: string | null;
  @ApiProperty({
    description:
      'Следующая (или последняя обработанная, если правило архивировано) дата occurrence',
    format: 'date',
  })
  nextOccurrenceDate!: string;
  @ApiProperty({
    description: 'Дата архивирования/деактивации',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  archivedAt!: string | null;
  @ApiProperty({
    description:
      'Хотя бы одна операция уже сгенерирована — hard delete недоступен, доступно только архивирование',
  })
  hasGeneratedTransactions!: boolean;
  @ApiProperty({ description: 'Создано', format: 'date-time' })
  createdAt!: string;
  @ApiProperty({ description: 'Изменено', format: 'date-time' })
  updatedAt!: string;
}
export class RecurringPageDto extends PageDto {
  @ApiProperty({ description: 'Правила страницы', type: [RecurringDto] })
  items!: RecurringDto[];
}
export class RecurringQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Состояние правил',
    enum: ['all', 'active', 'archived'],
    default: 'all',
  })
  state?: string;
}
export class RecurringRemovalDto {
  @ApiProperty({
    description:
      'Результат: удалено (ещё не создавало операций) либо архивировано (история сохранена)',
    enum: ['deleted', 'archived'],
  })
  outcome!: 'deleted' | 'archived';
}
