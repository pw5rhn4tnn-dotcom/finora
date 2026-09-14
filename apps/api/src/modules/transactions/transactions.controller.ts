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
  idSchema,
  transactionQuery,
  transactionSchema,
  transactionPatch,
} from '../finance/validation.js';
import {
  TransactionDto,
  TransactionInputDto,
  TransactionPatchDto,
  TransactionQueryDto,
  TransactionPageDto,
} from '../finance/finance.dto.js';
import { TransactionsService } from './transactions.service.js';
@ApiTags('Транзакции')
@ApiCookieAuth()
@ApiProblems()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}
  @Get()
  @ApiOperation({
    operationId: 'transactionsList',
    summary: 'Список собственных записей с серверной пагинацией',
  })
  @ApiOkResponse({ type: TransactionPageDto })
  list(@CurrentUser() user: User, @Query() query: TransactionQueryDto) {
    return this.service.list(user.id, validate(transactionQuery, query));
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'transactionsGet',
    summary: 'Получить собственную запись',
  })
  @ApiOkResponse({ type: TransactionDto })
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.get(user.id, validate(idSchema, id));
  }
  @Post()
  @ApiOperation({
    operationId: 'transactionsCreate',
    summary: 'Создать запись с атомарным аудитом',
  })
  @ApiBody({ type: TransactionInputDto })
  @ApiCreatedResponse({ type: TransactionDto })
  create(@CurrentUser() user: User, @Body() body: unknown) {
    return this.service.create(user.id, validate(transactionSchema, body));
  }
  @Patch(':id')
  @ApiOperation({
    operationId: 'transactionsUpdate',
    summary:
      'Изменить собственную запись; требуется хотя бы одно разрешённое поле',
  })
  @ApiBody({ type: TransactionPatchDto })
  @ApiOkResponse({ type: TransactionDto })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.update(
      user.id,
      validate(idSchema, id),
      validate(transactionPatch, body),
    );
  }
  @Delete(':id')
  @ApiOperation({
    operationId: 'transactionsDelete',
    summary: 'Удалить собственную запись с сохранением аудита',
  })
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Операция удалена, история сохранена' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.remove(user.id, validate(idSchema, id));
  }
}
