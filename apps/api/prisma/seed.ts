import { createDatabaseClient, databaseUrl } from '../src/prisma/client.js';
import { errorDiagnostics } from '../src/infrastructure/error-diagnostics.js';
import { seedDatabase } from './seed-database.js';

const client = createDatabaseClient(databaseUrl());
try {
  console.log(
    JSON.stringify({
      stage: 'seed',
      ...(await seedDatabase(
        client,
        process.env['SEED_ANCHOR_DATE'] || undefined,
      )),
    }),
  );
} catch (error: unknown) {
  console.error({
    message: 'Ошибка seed: набор не загружен, транзакция отменена',
    ...errorDiagnostics(error),
  });
  process.exitCode = 1;
} finally {
  await client.$disconnect();
}
