import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import {
  categoryIcons,
  decimalPattern,
  ratePattern,
  transactionTypes,
} from './validation.js';
export class CategoryInputDto {
  @ApiProperty({
    description:
      'Название категории; trim, уникально без регистра в пределах владельца и типа',
    minLength: 1,
    maxLength: 100,
  })
  name!: string;
  @ApiProperty({ description: 'Тип категории', enum: transactionTypes }) type!:
    'INCOME' | 'EXPENSE';
  @ApiProperty({ description: 'Иконка категории', enum: categoryIcons })
  icon!: string;
  @ApiProperty({ description: 'Цвет категории', pattern: '^#[0-9a-fA-F]{6}$' })
  color!: string;
}
export class CategoryPatchDto extends PartialType(CategoryInputDto) {}
export class CategoryDto extends CategoryInputDto {
  @ApiProperty({ description: 'Идентификатор категории', format: 'uuid' })
  id!: string;
  @ApiProperty({
    description: 'Дата архивирования',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  archivedAt!: string | null;
  @ApiProperty({ description: 'Создана', format: 'date-time' })
  createdAt!: string;
  @ApiProperty({ description: 'Изменена', format: 'date-time' })
  updatedAt!: string;
}
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Номер страницы от 1',
    type: Number,
    minimum: 1,
    maximum: 9999999,
    default: 1,
  })
  page?: number;
  @ApiPropertyOptional({
    description: 'Размер страницы',
    enum: [10, 25, 50],
    default: 25,
  })
  pageSize?: number;
}
export class CategoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Состояние категорий',
    enum: ['all', 'active', 'archived'],
    default: 'all',
  })
  state?: string;
}
export class PageDto {
  @ApiProperty({ description: 'Номер страницы' }) page!: number;
  @ApiProperty({ description: 'Размер страницы' }) pageSize!: number;
  @ApiProperty({ description: 'Всего собственных записей после фильтрации' })
  total!: number;
}
export class CategoryPageDto extends PageDto {
  @ApiProperty({ description: 'Категории страницы', type: [CategoryDto] })
  items!: CategoryDto[];
}
export class CategoryRemovalDto {
  @ApiProperty({
    description:
      'Результат: удалена неиспользованная либо архивирована используемая категория; активные связанные правила также архивируются',
    enum: ['deleted', 'archived'],
  })
  outcome!: 'deleted' | 'archived';
}
export class TransactionInputDto {
  @ApiProperty({
    description:
      'Положительная сумма десятичной строкой; точность валюты из ICU, максимум 16 целых и 8 дробных знаков',
    pattern: decimalPattern,
  })
  amount!: string;
  @ApiProperty({
    description: 'Код валюты из /settings/options',
    example: 'RUB',
  })
  currency!: string;
  @ApiPropertyOptional({
    description:
      'Положительный курс к основной валюте; обязателен для чужой валюты и при смене валюты. Для основной валюты равен 1',
    pattern: ratePattern,
  })
  exchangeRate?: string;
  @ApiProperty({
    description: 'Собственная категория соответствующего типа',
    format: 'uuid',
  })
  categoryId!: string;
  @ApiProperty({ description: 'Тип операции', enum: transactionTypes }) type!:
    'INCOME' | 'EXPENSE';
  @ApiProperty({
    description: 'Календарная дата, без сдвига timezone',
    format: 'date',
    example: '2026-09-14',
  })
  transactionDate!: string;
  @ApiProperty({
    description: 'Описание; пробелы по краям удаляются',
    minLength: 1,
    maxLength: 500,
  })
  description!: string;
}
export class TransactionPatchDto extends PartialType(TransactionInputDto) {}
export class TransactionDto extends TransactionInputDto {
  @ApiProperty({ description: 'Идентификатор операции', format: 'uuid' })
  id!: string;
  @ApiProperty({ description: 'Сохранённый курс', pattern: ratePattern })
  declare exchangeRate: string;
  @ApiProperty({
    description: 'Сумма в основной валюте, рассчитанная сервером',
    pattern: decimalPattern,
  })
  amountInBaseCurrency!: string;
  @ApiProperty({
    description: 'Категория, включая архивную',
    type: CategoryDto,
  })
  category!: CategoryDto;
  @ApiProperty({
    description: 'Источник операции',
    enum: ['MANUAL', 'CSV', 'RECURRING'],
  })
  source!: 'MANUAL' | 'CSV' | 'RECURRING';
  @ApiProperty({
    description: 'Историческая связь с правилом',
    type: String,
    format: 'uuid',
    nullable: true,
  })
  recurringTransactionId!: string | null;
  @ApiProperty({
    description: 'Дата исходного повторения',
    type: String,
    format: 'date',
    nullable: true,
  })
  recurringOccurrenceDate!: string | null;
  @ApiProperty({ description: 'Создана', format: 'date-time' })
  createdAt!: string;
  @ApiProperty({ description: 'Изменена', format: 'date-time' })
  updatedAt!: string;
}
export class TransactionPageDto extends PageDto {
  @ApiProperty({ description: 'Операции страницы', type: [TransactionDto] })
  items!: TransactionDto[];
}
export class TransactionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Буквальный поиск без регистра по описанию и категории; пробелы по краям удаляются',
    maxLength: 200,
  })
  search?: string;
  @ApiPropertyOptional({
    description: 'Тип операции',
    enum: ['ALL', ...transactionTypes],
    default: 'ALL',
  })
  type?: 'ALL' | 'INCOME' | 'EXPENSE';
  @ApiPropertyOptional({
    description: 'Категория, включая архивную',
    format: 'uuid',
  })
  categoryId?: string;
  @ApiPropertyOptional({
    description: 'Начальная дата включительно',
    format: 'date',
  })
  dateFrom?: string;
  @ApiPropertyOptional({
    description: 'Конечная дата включительно',
    format: 'date',
  })
  dateTo?: string;
  @ApiPropertyOptional({
    description: 'Минимум в основной валюте',
    pattern: decimalPattern,
  })
  amountMin?: string;
  @ApiPropertyOptional({
    description: 'Максимум в основной валюте',
    pattern: decimalPattern,
  })
  amountMax?: string;
  @ApiPropertyOptional({ description: 'Исходная валюта из /settings/options' })
  currency?: string;
  @ApiPropertyOptional({
    description:
      'Порядок; суммы в основной валюте, стабильный дополнительный порядок по id',
    enum: ['newest', 'oldest', 'amountDesc', 'amountAsc'],
    default: 'newest',
  })
  sort?: 'newest' | 'oldest' | 'amountDesc' | 'amountAsc';
}
export class TransactionExportQueryDto extends OmitType(TransactionQueryDto, [
  'page',
  'pageSize',
] as const) {}
