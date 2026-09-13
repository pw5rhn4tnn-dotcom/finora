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
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const traceId =
      response.getHeader('x-request-id')?.toString() ?? randomUUID();
    const detail =
      status === 404
        ? 'Ресурс не найден'
        : status === 503
          ? 'База данных недоступна'
          : 'Внутренняя ошибка сервера';
    if (status >= 500)
      this.logger.error({
        message: detail,
        traceId,
        status,
        ...errorDiagnostics(error),
      });
    const body: ProblemDto = {
      type: status === 404 ? 'not_found' : 'internal_error',
      title: detail,
      detail,
      status,
      errors: {},
      traceId,
    };
    response.writeHead(status, {
      'content-type': 'application/problem+json',
      'x-request-id': traceId,
    });
    response.end(JSON.stringify(body));
  }
}
