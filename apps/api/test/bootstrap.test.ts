import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AppModule } from '../src/app.module.js';
import { bootstrap } from '../src/bootstrap.js';

await test('запускает Nest HTTP server без предметных маршрутов и корректно закрывает его', async () => {
  const app = await bootstrap(0);

  try {
    assert.ok(app.get(AppModule) instanceof AppModule);
    const response = await fetch(await app.getUrl());
    assert.equal(response.status, 404);
    await response.text();
  } finally {
    await app.close();
  }
});
