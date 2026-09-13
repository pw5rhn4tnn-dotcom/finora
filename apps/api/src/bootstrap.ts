import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

export async function bootstrap(port = 3000) {
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  app.enableShutdownHooks();
  try {
    await app.listen(port, '127.0.0.1');
  } catch (error: unknown) {
    await app.close();
    throw error;
  }
  return app;
}
