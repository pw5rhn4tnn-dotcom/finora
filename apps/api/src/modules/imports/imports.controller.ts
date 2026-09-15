import {
  Body,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';

const { memoryStorage } = multer;
import {
  ApiBody,
  ApiConsumes,
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
  ImportAnalysisDto,
  ImportPreviewDto,
  ImportResultDto,
  importAnalyzeMultipartSchema,
  importMultipartSchema,
} from './imports.dto.js';
import { ImportsService, readCsvFile } from './imports.service.js';
import {
  MAX_FILE_BYTES,
  importCategoryMapSchema,
  importMappingSchema,
  importOptionsSchema,
  importRatesSchema,
  parseJsonField,
} from './imports.validation.js';

const upload = () =>
  FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  });

function readOptions(body: Record<string, unknown>) {
  const raw = (field: string) =>
    typeof body[field] === 'string' ? body[field] : undefined;
  return validate(importOptionsSchema, {
    mapping: parseJsonField(
      importMappingSchema,
      'mapping',
      raw('mapping'),
      '{}',
    ),
    categoryMap: parseJsonField(
      importCategoryMapSchema,
      'categoryMap',
      raw('categoryMap'),
      '{}',
    ),
    rates: parseJsonField(importRatesSchema, 'rates', raw('rates'), '{}'),
    includeDuplicates: raw('includeDuplicates') === 'true',
  });
}

@ApiTags('Импорт CSV')
@ApiCookieAuth()
@ApiProblems()
@Controller('imports')
export class ImportsController {
  constructor(private readonly service: ImportsService) {}

  @Post('preview')
  @ApiOperation({
    operationId: 'importsPreview',
    summary: 'Разобрать файл и вернуть столбцы/пример строк без валидации',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: importMultipartSchema })
  @ApiOkResponse({ type: ImportPreviewDto })
  @HttpCode(200)
  @UseInterceptors(upload())
  preview(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.service.preview(readCsvFile(file));
  }

  @Post('validate')
  @ApiOperation({
    operationId: 'importsValidate',
    summary:
      'Проверить файл с маппингом без записи в БД: построчная validation и duplicate analysis',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: importAnalyzeMultipartSchema })
  @ApiOkResponse({ type: ImportAnalysisDto })
  @HttpCode(200)
  @UseInterceptors(upload())
  validate(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.validate(user.id, readCsvFile(file), readOptions(body));
  }

  @Post()
  @ApiOperation({
    operationId: 'importsCreate',
    summary:
      'Повторить validation по актуальной БД и атомарно импортировать валидные строки с аудитом',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: importAnalyzeMultipartSchema })
  @ApiCreatedResponse({ type: ImportResultDto })
  @UseInterceptors(upload())
  create(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.commit(user.id, readCsvFile(file), readOptions(body));
  }
}
