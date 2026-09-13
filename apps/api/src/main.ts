import { Logger } from '@nestjs/common';
import { bootstrap } from './bootstrap.js';
import { errorDiagnostics } from './infrastructure/error-diagnostics.js';

bootstrap(
  Number(process.env['API_PORT'] ?? '3000'),
  process.env['API_HOST'] ?? '127.0.0.1',
).catch((error: unknown) => {
  Logger.error({
    message:
      'Не удалось запустить приложение; проверьте конфигурацию и доступность PostgreSQL',
    ...errorDiagnostics(error),
  });
  process.exitCode = 1;
});
