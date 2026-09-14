import { argon2Sync, createHash } from 'node:crypto';
import { Prisma } from '../src/generated/prisma/client.js';

export const demoProfiles = [
  {
    key: 'personal',
    email: 'personal@finora.example',
    password: 'Finora-Personal-2026!',
    name: 'Алексей · личные финансы',
    salary: '110000',
    rent: '32000',
    size: 20,
  },
  {
    key: 'family',
    email: 'family@finora.example',
    password: 'Finora-Family-2026!',
    name: 'Мария · семейный бюджет',
    salary: '210000',
    rent: '62000',
    size: 28,
  },
] as const;

export { categoryTemplates } from '../src/modules/categories/default-categories.js';

export function seedId(key: string): string {
  const hex = createHash('sha256')
    .update(`finora-demo-v1:${key}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export const completionId = seedId(
  'audit:family:category:subscriptions:create',
);

export function referenceMonth(value?: string): Date {
  if (value !== undefined && !/^\d{4}-\d{2}-01$/.test(value))
    throw new Error('SEED_ANCHOR_DATE должен иметь формат YYYY-MM-01');
  const date =
    value === undefined ? new Date() : new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    (value !== undefined && date.toISOString().slice(0, 10) !== value)
  )
    throw new Error('Некорректный SEED_ANCHOR_DATE');
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function monthDate(anchor: Date, offset: number, day = 1): Date {
  return new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + offset, day),
  );
}

export function demoPasswordHash(key: string, password: string): string {
  // Только публичные demo-пароли: стабильная отдельная соль для каждого профиля.
  const salt = createHash('sha256')
    .update(`finora-demo-salt-v1:${key}`)
    .digest()
    .subarray(0, 16);
  const hash = argon2Sync('argon2id', {
    message: password,
    nonce: salt,
    parallelism: 1,
    tagLength: 32,
    memory: 65536,
    passes: 3,
  });
  return `$argon2id$v=19$m=65536,t=3,p=1$${salt.toString('base64url').replaceAll('-', '+').replaceAll('_', '/')}$${hash.toString('base64url').replaceAll('-', '+').replaceAll('_', '/')}`;
}

export function snapshot(value: object): Prisma.InputJsonObject {
  // Prisma Decimal сериализуется десятичной строкой; даты — согласованными строками.
  const serialized: unknown = JSON.parse(
    JSON.stringify(value, (key: string, item: unknown) => {
      if (
        typeof item === 'string' &&
        [
          'transactionDate',
          'recurringOccurrenceDate',
          'startDate',
          'endDate',
          'nextOccurrenceDate',
        ].includes(key)
      )
        return item.slice(0, 10);
      return item;
    }),
  );
  if (
    !serialized ||
    typeof serialized !== 'object' ||
    Array.isArray(serialized)
  )
    throw new Error('Некорректный audit snapshot');
  return serialized;
}
