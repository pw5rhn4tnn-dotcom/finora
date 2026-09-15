import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import type { User } from '../../generated/prisma/client.js';
import { ApiProblems } from '../../common/api-problems.js';
import { CurrentUser } from '../auth/auth.guard.js';
import { validate } from '../users/preferences.js';
import {
  idSchema,
  transactionExportQuery,
  transactionQuery,
  transactionSchema,
  transactionPatch,
} from '../finance/validation.js';
import {
  TransactionDto,
  TransactionExportQueryDto,
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

  @Get('export')
  @ApiOperation({
    operationId: 'transactionsExport',
    summary:
      'Экспортировать в CSV все записи по текущим фильтрам без ограничения страницы',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({ description: 'CSV-файл, UTF-8 с BOM, CRLF' })
  async export(
    @CurrentUser() user: User,
    @Query() query: TransactionExportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const csv = await this.service.export(
      user.id,
      validate(transactionExportQuery, query),
    );
    const filename = `finora-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    return csv;
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
