import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export function createDatabaseClient(url: string) {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      connectionTimeoutMillis: 3000,
      query_timeout: 3000,
    }),
  });
}

export function databaseUrl(): string {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('Не задан DATABASE_URL');
  return url;
}
