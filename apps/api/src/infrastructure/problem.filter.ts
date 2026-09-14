import { Problem } from '../common/problem.js';
import { errorDiagnostics } from './error-diagnostics.js';
import { randomUUID } from 'node:crypto';
import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import type { ServerResponse } from 'node:http';

export class ProblemDto {
  @ApiProperty({ description: 'Категория ошибки', example: 'internal_error' })
  type!: string;
  @ApiProperty({ description: 'Краткое описание ошибки' }) title!: string;
  @ApiProperty({ description: 'HTTP-статус' }) status!: number;
  @ApiProperty({ description: 'Безопасное описание причины' }) detail!: string;
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'array', items: { type: 'string' } },
    description: 'Ошибки полей',
  })
  errors!: Record<string, string[]>;
  @ApiProperty({ description: 'Идентификатор запроса' }) traceId!: string;
}

@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemFilter.name);
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<ServerResponse>();
    const parserStatus =
      error && typeof error === 'object' && 'type' in error
        ? error.type === 'entity.too.large'
          ? 413
          : error.type === 'entity.parse.failed'
            ? 400
            : undefined
        : undefined;
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : (parserStatus ?? 500);
    const traceId =
      response.getHeader('x-request-id')?.toString() ?? randomUUID();
    const messages: Record<number, string> = {
      400: 'Переданы некорректные данные',
      401: 'Войдите в аккаунт',
      403: 'Доступ запрещён',
      404: 'Ресурс не найден',
      409: 'Конфликт данных',
      413: 'Запрос слишком большой',
      429: 'Слишком много запросов',
      503: 'База данных недоступна',
    };
    const types: Record<number, string> = {
      400: 'validation_error',
      401: 'authentication_error',
      403: 'authorization_error',
      404: 'not_found',
      409: 'conflict',
      413: 'validation_error',
      429: 'rate_limit',
    };
    const detail =
      error instanceof Problem
        ? error.detail
        : (messages[status] ?? 'Внутренняя ошибка сервера');
    if (status >= 500)
      this.logger.error({
        message: detail,
        traceId,
        status,
        ...errorDiagnostics(error),
      });
    const body: ProblemDto = {
      type:
        error instanceof Problem
          ? error.type
          : (types[status] ?? 'internal_error'),
      title: detail,
      detail,
      status,
      errors: error instanceof Problem ? error.errors : {},
      traceId,
    };
    response.writeHead(status, {
      'content-type': 'application/problem+json',
      'x-request-id': traceId,
    });
    response.end(JSON.stringify(body));
  }
}
