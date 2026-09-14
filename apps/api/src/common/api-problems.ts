import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ProblemDto } from '../infrastructure/problem.filter.js';
export function ApiProblems() {
  return applyDecorators(
    ...[400, 401, 403, 409, 413, 429, 500].map((status) =>
      ApiResponse({
        status,
        description: 'Ошибка запроса; 429 содержит Retry-After в секундах',
        content: {
          'application/problem+json': {
            schema: { $ref: '#/components/schemas/ProblemDto' },
          },
        },
      }),
    ),
  );
}
// Модель регистрируется в createOpenApi, поскольку схемы ошибок заданы через content.
export { ProblemDto };
