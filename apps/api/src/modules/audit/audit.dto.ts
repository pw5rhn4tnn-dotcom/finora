import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageDto, PaginationQueryDto } from '../finance/finance.dto.js';
import { auditActions, auditEntityTypes } from './audit.validation.js';

export class AuditEntryDto {
  @ApiProperty({ description: 'Идентификатор записи аудита', format: 'uuid' })
  id!: string;
  @ApiProperty({
    description: 'Тип затронутой сущности',
    enum: auditEntityTypes,
  })
  entityType!: (typeof auditEntityTypes)[number];
  @ApiProperty({
    description:
      'Идентификатор затронутой сущности; сущность может быть уже удалена',
    format: 'uuid',
  })
  entityId!: string;
  @ApiProperty({ description: 'Действие', enum: auditActions })
  action!: (typeof auditActions)[number];
  @ApiProperty({
    description:
      'Снимок до изменения; отсутствует для CREATE. Раскладка полей зависит от entityType',
    type: Object,
    nullable: true,
  })
  before!: Record<string, unknown> | null;
  @ApiProperty({
    description: 'Снимок после изменения; отсутствует для DELETE',
    type: Object,
    nullable: true,
  })
  after!: Record<string, unknown> | null;
  @ApiProperty({ description: 'Момент записи', format: 'date-time' })
  createdAt!: string;
}
export class AuditPageDto extends PageDto {
  @ApiProperty({ description: 'Записи страницы', type: [AuditEntryDto] })
  items!: AuditEntryDto[];
}
export class AuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Тип сущности',
    enum: ['ALL', ...auditEntityTypes],
    default: 'ALL',
  })
  entityType?: string;
  @ApiPropertyOptional({
    description: 'История одной сущности (обычно вместе с entityType)',
    format: 'uuid',
  })
  entityId?: string;
  @ApiPropertyOptional({
    description: 'Действие',
    enum: ['ALL', ...auditActions],
    default: 'ALL',
  })
  action?: string;
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
}
