import { Logger } from '@nestjs/common';
import { bootstrap } from './bootstrap.js';

bootstrap().catch((error: unknown) => {
  Logger.error(error, 'Не удалось запустить приложение');
  process.exitCode = 1;
});
