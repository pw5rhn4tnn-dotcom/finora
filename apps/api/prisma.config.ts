import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'pnpm db:seed' },
  datasource: {
    url:
      process.env['MIGRATION_DATABASE_URL'] ??
      process.env['DATABASE_URL'] ??
      '',
  },
});
