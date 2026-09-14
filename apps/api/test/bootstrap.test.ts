import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AppModule } from '../src/app.module.js';
import { bootstrap } from '../src/bootstrap.js';
import { databaseFixture } from './database-fixture.js';

await test('запускает Nest HTTP server с Prisma, Swagger и инфраструктурными маршрутами', async () => {
  process.env['AUTH_SECRET'] = 'finora-test-secret-at-least-32-bytes';
  const fixture = await databaseFixture();
  const previous = process.env['DATABASE_URL'];
  process.env['DATABASE_URL'] = fixture.runtimeUrl;
  let app: Awaited<ReturnType<typeof bootstrap>> | undefined;
  try {
    app = await bootstrap(0);
    assert.ok(app.get(AppModule) instanceof AppModule);
    const url = await app.getUrl();
    assert.equal((await fetch(url)).status, 404);
    assert.equal((await fetch(`${url}/api/v1/transactions`)).status, 404);
    assert.equal((await fetch(`${url}/health/live`)).status, 200);
    assert.equal((await fetch(`${url}/health/ready`)).status, 200);
    assert.equal((await fetch(`${url}/docs`)).status, 200);
    const schema = await fetch(`${url}/docs/openapi.json`);
    assert.equal(schema.status, 200);
    const schemaText = await schema.text();
    assert.match(schemaText, /healthReady/);
    assert.match(schemaText, /application\/problem\+json/);
    await fixture.admin.query(
      `ALTER DATABASE "${fixture.name}" ALLOW_CONNECTIONS false`,
    );
    await fixture.admin.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1',
      [fixture.name],
    );
    assert.equal((await fetch(`${url}/health/live`)).status, 200);
    const unavailable = await fetch(`${url}/health/ready`);
    assert.equal(unavailable.status, 503);
    assert.match(
      unavailable.headers.get('content-type') ?? '',
      /^application\/problem\+json/,
    );
    const problem: unknown = await unavailable.json();
    assert.ok(problem && typeof problem === 'object' && 'traceId' in problem);
    assert.ok(!JSON.stringify(problem).includes('password'));
    await fixture.admin.query(
      `ALTER DATABASE "${fixture.name}" ALLOW_CONNECTIONS true`,
    );
    assert.equal((await fetch(`${url}/health/ready`)).status, 200);
  } finally {
    await app?.close();
    if (previous === undefined) delete process.env['DATABASE_URL'];
    else process.env['DATABASE_URL'] = previous;
    await fixture.close();
  }
});
