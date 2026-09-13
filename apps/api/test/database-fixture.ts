import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import { createDatabaseClient } from '../src/prisma/client.js';

const exec = promisify(execFile);
export async function databaseFixture() {
  const base = process.env['MIGRATION_DATABASE_URL'];
  if (!base)
    throw new Error(
      'Тестам требуется MIGRATION_DATABASE_URL отдельной локальной/CI PostgreSQL; см. README',
    );
  const name = `finora_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Client({ connectionString: base });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  const migrationUrl = new URL(base);
  migrationUrl.pathname = `/${name}`;
  const runtimeUrl = new URL(migrationUrl);
  runtimeUrl.username = 'finora_runtime';
  runtimeUrl.password = 'finora_local_runtime';
  const client = createDatabaseClient(runtimeUrl.toString());
  async function close() {
    await client.$disconnect();
    await admin.query(`ALTER DATABASE "${name}" ALLOW_CONNECTIONS true`);
    await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await admin.end();
  }
  try {
    const env = {
      ...process.env,
      MIGRATION_DATABASE_URL: migrationUrl.toString(),
    };
    await exec('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], { env });
    await exec('node', ['scripts/grant-runtime.mjs'], { env });
    return {
      name,
      admin,
      client,
      migrationUrl: migrationUrl.toString(),
      runtimeUrl: runtimeUrl.toString(),
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}
