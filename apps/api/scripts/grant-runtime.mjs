import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.MIGRATION_DATABASE_URL,
  connectionTimeoutMillis: 3000,
});
try {
  if (!process.env.MIGRATION_DATABASE_URL)
    throw new Error('Не задан MIGRATION_DATABASE_URL');
  await client.connect();
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(706913, 3)');
  await client.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'finora_runtime') THEN
      CREATE ROLE finora_runtime LOGIN PASSWORD 'finora_local_runtime' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
  END $$`);
  await client.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC;
    GRANT USAGE ON SCHEMA public TO finora_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON users, categories, transactions, budgets, recurring_transactions TO finora_runtime;
    GRANT SELECT, INSERT ON audit_entries TO finora_runtime;
    REVOKE UPDATE, DELETE, TRUNCATE ON audit_entries FROM finora_runtime;`);
  await client.query('COMMIT');
  console.log('Права runtime-роли настроены');
} catch {
  console.error('Не удалось настроить права runtime-роли');
  process.exitCode = 1;
} finally {
  await client.end();
}
