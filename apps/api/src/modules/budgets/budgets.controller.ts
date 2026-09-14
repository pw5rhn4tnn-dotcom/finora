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
  HttpCode,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import type { User } from '../../generated/prisma/client.js';
import { ApiProblems } from '../../common/api-problems.js';
import { CurrentUser } from '../auth/auth.guard.js';
import { validate } from '../users/preferences.js';
import {
  budgetQuery,
  budgetSchema,
  budgetPatch,
} from './budgets.validation.js';
import {
  BudgetDto,
  BudgetInputDto,
  BudgetPatchDto,
  BudgetQueryDto,
  BudgetPageDto,
} from './budgets.dto.js';
import { BudgetsService } from './budgets.service.js';
@ApiTags('Бюджеты')
@ApiCookieAuth()
@ApiProblems()
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}
  @Get()
  @ApiOperation({
    operationId: 'budgetsList',
    summary: 'Список собственных записей с серверной пагинацией',
  })
  @ApiOkResponse({ type: BudgetPageDto })
  list(@CurrentUser() user: User, @Query() query: BudgetQueryDto) {
    return this.service.list(user.id, validate(budgetQuery, query));
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'budgetsGet',
    summary: 'Получить собственную запись',
  })
  @ApiOkResponse({ type: BudgetDto })
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.get(user.id, validate(idSchema, id));
  }
  @Post()
  @ApiOperation({
    operationId: 'budgetsCreate',
    summary: 'Создать запись с атомарным аудитом',
  })
  @ApiBody({ type: BudgetInputDto })
  @ApiCreatedResponse({ type: BudgetDto })
  create(@CurrentUser() user: User, @Body() body: unknown) {
    return this.service.create(user.id, validate(budgetSchema, body));
  }
  @Patch(':id')
  @ApiOperation({
    operationId: 'budgetsUpdate',
    summary:
      'Изменить собственную запись; требуется хотя бы одно разрешённое поле',
  })
  @ApiBody({ type: BudgetPatchDto })
  @ApiOkResponse({ type: BudgetDto })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.update(
      user.id,
      validate(idSchema, id),
      validate(budgetPatch, body),
    );
  }
  @Delete(':id')
  @ApiOperation({
    operationId: 'budgetsDelete',
    summary: 'Удалить собственную запись с сохранением аудита',
  })
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Бюджет удалён, история сохранена' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.remove(user.id, validate(idSchema, id));
  }
}
