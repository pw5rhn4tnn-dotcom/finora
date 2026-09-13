import { type INestApplication, RequestMethod } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createOpenApi(app: INestApplication) {
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Finora API')
      .setDescription(
        'Инфраструктурный контракт Finora. Предметные функции появятся на следующих этапах.',
      )
      .setVersion('0.2.0')
      .build(),
  );
}
