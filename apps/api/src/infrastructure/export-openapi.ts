import 'reflect-metadata';
import { mkdir, writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { createOpenApi } from './openapi.js';

// Создание документа не запускает lifecycle/connect/listen.
process.env['DATABASE_URL'] ??= 'postgresql://unused:unused@127.0.0.1:1/unused';
const app = await NestFactory.create(AppModule, {
  abortOnError: false,
  logger: false,
});
try {
  await mkdir('../../packages/api-client/openapi', { recursive: true });
  await writeFile(
    '../../packages/api-client/openapi/finora.json',
    JSON.stringify(createOpenApi(app), null, 2) + '\n',
  );
} finally {
  await app.close();
}
