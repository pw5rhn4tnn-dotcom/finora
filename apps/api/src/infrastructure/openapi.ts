import { ProblemDto } from './problem.filter.js';
import { type INestApplication, RequestMethod } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createOpenApi(app: INestApplication) {
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Finora API')
      .setDescription(
        'Finora: авторизация, настройки, категории, операции, месячные бюджеты и обзор с insights. Изменяющие запросы требуют разрешённый Origin. Сессия: HttpOnly cookie, 24 часа.',
      )
      .setVersion('0.7.0')
      .addCookieAuth('finora_session')
      .build(),
    { extraModels: [ProblemDto] },
  );
  for (const name of [
    'LoginInputDto',
    'RegisterInputDto',
    'ProfileInputDto',
    'CategoryInputDto',
    'CategoryPatchDto',
    'TransactionInputDto',
    'TransactionPatchDto',
    'BudgetInputDto',
    'BudgetPatchDto',
  ]) {
    const schema = document.components?.schemas?.[name];
    if (schema && !('$ref' in schema)) schema.additionalProperties = false;
  }
  return document;
}
