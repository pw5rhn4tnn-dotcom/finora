import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ConsoleLogger, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { createOpenApi } from './infrastructure/openapi.js';
import { ProblemFilter } from './infrastructure/problem.filter.js';

export async function bootstrap(port = 3000, host = '127.0.0.1') {
  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
    logger: new ConsoleLogger({ json: true }),
  });
  app.enableShutdownHooks();
  const logger = new Logger('HTTP');
  app.use(
    (request: IncomingMessage, response: ServerResponse, next: () => void) => {
      const traceId = randomUUID();
      const start = performance.now();
      response.setHeader('x-request-id', traceId);
      response.on('finish', () => {
        const pathname = request.url?.split('?')[0];
        const route =
          pathname === '/health/live' || pathname === '/health/ready'
            ? pathname
            : 'other';
        logger.log({
          traceId,
          method: request.method,
          route,
          status: response.statusCode,
          durationMs: Math.round(performance.now() - start),
        });
      });
      next();
    },
  );
  app.useGlobalFilters(new ProblemFilter());
  SwaggerModule.setup('docs', app, createOpenApi(app), {
    jsonDocumentUrl: 'docs/openapi.json',
  });
  try {
    await app.listen(port, host);
  } catch (error: unknown) {
    await app.close();
    throw error;
  }
  return app;
}
