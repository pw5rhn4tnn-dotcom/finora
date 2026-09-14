import type { NestExpressApplication } from '@nestjs/platform-express';
import { SessionService } from './modules/auth/session.service.js';
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
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    abortOnError: false,
    logger: new ConsoleLogger({ json: true }),
  });
  app.enableShutdownHooks();
  // В Compose API доступен только через Nginx, который заменяет X-Forwarded-For.
  if (process.env['AUTH_TRUST_PROXY'] === 'true') app.set('trust proxy', 1);
  const origins = app.get(SessionService).origins;
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  });
  const logger = new Logger('HTTP');
  app.use(
    (request: IncomingMessage, response: ServerResponse, next: () => void) => {
      const traceId = randomUUID();
      const start = performance.now();
      response.setHeader('x-request-id', traceId);
      response.setHeader('Cache-Control', 'no-store');
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
  app.useBodyParser('json', { limit: '16kb' });
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
