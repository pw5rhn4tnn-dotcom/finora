import { ApiProperty } from '@nestjs/swagger';

export class ImportPreviewDto {
  @ApiProperty({ description: 'Заголовки столбцов файла в исходном порядке' })
  columns!: string[];
  @ApiProperty({
    description: 'Первые строки данных файла для предпросмотра маппинга',
    type: 'array',
    items: { type: 'array', items: { type: 'string' } },
  })
  sampleRows!: string[][];
  @ApiProperty({ description: 'Всего строк данных в файле (без заголовка)' })
  totalRows!: number;
}
export class ImportRowErrorDto {
  @ApiProperty({
    description: 'Поле цели маппинга, к которому относится ошибка',
  })
  field!: string;
  @ApiProperty({ description: 'Читаемое описание ошибки' }) message!: string;
}
export class ImportRowResultDto {
  @ApiProperty({ description: 'Номер строки данных файла, начиная с 1' })
  row!: number;
  @ApiProperty({
    description:
      'valid — будет импортирована; invalid — пропущена по ошибке; duplicate — пропущена как вероятный дубль',
    enum: ['valid', 'invalid', 'duplicate'],
  })
  status!: 'valid' | 'invalid' | 'duplicate';
  @ApiProperty({ description: 'Ошибки строки', type: [ImportRowErrorDto] })
  errors!: ImportRowErrorDto[];
}
export class ImportAnalysisDto {
  @ApiProperty({ description: 'Всего строк данных в файле' })
  totalRows!: number;
  @ApiProperty({ description: 'Строк, готовых к импорту' })
  importableRows!: number;
  @ApiProperty({ description: 'Строк, пропущенных как вероятные дубли' })
  duplicateRows!: number;
  @ApiProperty({ description: 'Строк, пропущенных по ошибкам валидации' })
  invalidRows!: number;
  @ApiProperty({
    description: 'Результат по каждой строке',
    type: [ImportRowResultDto],
  })
  rows!: ImportRowResultDto[];
  @ApiProperty({
    description:
      'Уникальные исходные значения категории без сопоставления в categoryMap — для шага category mapping мастера',
  })
  unmappedCategories!: string[];
  @ApiProperty({
    description:
      'Валюты, для которых в файле или в rates не хватает курса к основной валюте',
  })
  missingRateCurrencies!: string[];
}
export class ImportResultDto extends ImportAnalysisDto {
  @ApiProperty({ description: 'Фактически импортировано операций' })
  imported!: number;
}
export const importMultipartSchema = {
  type: 'object' as const,
  properties: {
    file: {
      type: 'string',
      format: 'binary',
      description: 'CSV-файл, UTF-8, до 5 МБ',
    },
  },
  required: ['file'],
};
export const importAnalyzeMultipartSchema = {
  type: 'object' as const,
  properties: {
    file: {
      type: 'string',
      format: 'binary',
      description: 'CSV-файл, UTF-8, до 5 МБ',
    },
    mapping: {
      type: 'string',
      description:
        'JSON: соответствие целей (transactionDate/type/amount/currency/exchangeRate?/category/description) заголовкам столбцов файла',
    },
    categoryMap: {
      type: 'string',
      description:
        'JSON: соответствие исходных значений категории собственным categoryId',
    },
    rates: {
      type: 'string',
      description:
        'JSON: курс к основной валюте по коду валюты для строк без курса в файле',
    },
    includeDuplicates: {
      type: 'string',
      description:
        '"true" разрешает импорт строк, отмеченных как вероятные дубли',
      default: 'false',
    },
  },
  required: ['file', 'mapping'],
};
