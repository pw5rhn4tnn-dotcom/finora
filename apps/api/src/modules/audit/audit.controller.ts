import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '../../generated/prisma/client.js';
import { ApiProblems } from '../../common/api-problems.js';
import { CurrentUser } from '../auth/auth.guard.js';
import { validate } from '../users/preferences.js';
import { auditQuery } from './audit.validation.js';
import { AuditPageDto, AuditQueryDto } from './audit.dto.js';
import { AuditService } from './audit.service.js';

@ApiTags('Журнал изменений')
@ApiCookieAuth()
@ApiProblems()
@Controller('audit-log')
export class AuditController {
  constructor(private readonly service: AuditService) {}
  @Get()
  @ApiOperation({
    operationId: 'auditList',
    summary:
      'Read-only список собственных записей аудита с фильтрами и серверной пагинацией',
  })
  @ApiOkResponse({ type: AuditPageDto })
  list(@CurrentUser() user: User, @Query() query: AuditQueryDto) {
    return this.service.list(user.id, validate(auditQuery, query));
  }
}
