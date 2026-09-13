import { setTimeout } from 'node:timers/promises';
import pg from 'pg';

if (!process.env.MIGRATION_DATABASE_URL)
  throw new Error('Не задан MIGRATION_DATABASE_URL');
let connected = false;
for (let attempt = 0; attempt < 30; attempt++) {
  const client = new pg.Client({
    connectionString: process.env.MIGRATION_DATABASE_URL,
    connectionTimeoutMillis: 2000,
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
    connected = true;
    break;
  } catch {
    console.error(`PostgreSQL ещё недоступна: попытка ${attempt + 1}/30`);
  } finally {
    await client.end();
  }
  await setTimeout(1000);
}
if (!connected) throw new Error('Истёк срок ожидания PostgreSQL');
console.log('PostgreSQL готова');
