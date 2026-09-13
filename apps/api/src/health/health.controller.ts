import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiExtraModels,
  getSchemaPath,
  ApiOperation,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';
import { errorDiagnostics } from '../infrastructure/error-diagnostics.js';
import { ProblemDto } from '../infrastructure/problem.filter.js';

class HealthDto {
  @ApiProperty({ enum: ['ok'], description: 'Состояние инфраструктуры' })
  status!: 'ok';
}

@ApiTags('Инфраструктура')
@ApiExtraModels(ProblemDto)
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  @ApiOperation({
    operationId: 'healthLive',
    summary: 'Проверить работу процесса API',
  })
  @ApiOkResponse({ type: HealthDto, description: 'Проверка прошла успешно' })
  live(): HealthDto {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({
    operationId: 'healthReady',
    summary: 'Проверить доступность PostgreSQL',
  })
  @ApiOkResponse({ type: HealthDto, description: 'Проверка прошла успешно' })
  @ApiServiceUnavailableResponse({
    description: 'База данных недоступна',
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDto) },
      },
    },
  })
  async ready(): Promise<HealthDto> {
    try {
      await this.prisma.isReady();
      return { status: 'ok' };
    } catch (error: unknown) {
      this.logger.error({
        message: 'Проверка доступности PostgreSQL завершилась ошибкой',
        ...errorDiagnostics(error),
      });
      throw new ServiceUnavailableException('База данных недоступна');
    }
  }
}
