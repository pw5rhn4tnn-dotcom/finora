import { idSchema } from '../finance/validation.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '../../generated/prisma/client.js';
import { ApiProblems } from '../../common/api-problems.js';
import { CurrentUser } from '../auth/auth.guard.js';
import { validate } from '../users/preferences.js';
import {
  recurringPatch,
  recurringQuery,
  recurringSchema,
} from './recurring.validation.js';
import {
  RecurringDto,
  RecurringInputDto,
  RecurringPatchDto,
  RecurringQueryDto,
  RecurringPageDto,
  RecurringRemovalDto,
} from './recurring.dto.js';
import { RecurringService } from './recurring.service.js';

@ApiTags('Регулярные операции')
@ApiCookieAuth()
@ApiProblems()
@Controller('recurring-transactions')
export class RecurringController {
  constructor(private readonly service: RecurringService) {}
  @Get()
  @ApiOperation({
    operationId: 'recurringList',
    summary: 'Список собственных правил с серверной пагинацией',
  })
  @ApiOkResponse({ type: RecurringPageDto })
  list(@CurrentUser() user: User, @Query() query: RecurringQueryDto) {
    return this.service.list(user.id, validate(recurringQuery, query));
  }
  @Get(':id')
  @ApiOperation({
    operationId: 'recurringGet',
    summary: 'Получить собственное правило',
  })
  @ApiOkResponse({ type: RecurringDto })
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.get(user.id, validate(idSchema, id));
  }
  @Post()
  @ApiOperation({
    operationId: 'recurringCreate',
    summary:
      'Создать правило с атомарным аудитом; nextOccurrenceDate = startDate',
  })
  @ApiBody({ type: RecurringInputDto })
  @ApiCreatedResponse({ type: RecurringDto })
  create(@CurrentUser() user: User, @Body() body: unknown) {
    return this.service.create(user.id, validate(recurringSchema, body));
  }
  @Patch(':id')
  @ApiOperation({
    operationId: 'recurringUpdate',
    summary:
      'Изменить активное правило; перед изменением расписания сервис завершает catch-up по прежним параметрам',
  })
  @ApiBody({ type: RecurringPatchDto })
  @ApiOkResponse({ type: RecurringDto })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.update(
      user.id,
      validate(idSchema, id),
      validate(recurringPatch, body),
    );
  }
  @Delete(':id')
  @ApiOperation({
    operationId: 'recurringDelete',
    summary:
      'Удалить правило, ещё не создававшее операций, либо архивировать с сохранением истории',
  })
  @ApiOkResponse({ type: RecurringRemovalDto })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.remove(user.id, validate(idSchema, id));
  }
}
