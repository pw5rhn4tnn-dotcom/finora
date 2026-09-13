import { Prisma, type PrismaClient } from '../src/generated/prisma/client.js';
import {
  categoryTemplates,
  completionId,
  demoPasswordHash,
  demoProfiles,
  monthDate,
  referenceMonth,
  seedId,
  snapshot,
} from './seed-data.js';

export async function seedDatabase(client: PrismaClient, anchorValue?: string) {
  return client.$transaction(
    async (db) => {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(706913, 2)`;
      const completed = await db.auditEntry.findUnique({
        where: { id: completionId },
      });
      if (completed)
        return {
          initialized: false,
          anchor: monthDate(completed.createdAt, 5).toISOString().slice(0, 10),
        };
      const anchor = referenceMonth(anchorValue);
      const firstDate = monthDate(anchor, -5);
      const timestamps = { createdAt: firstDate, updatedAt: firstDate };
      let completion: Prisma.AuditEntryCreateManyInput | undefined;

      for (const profile of demoProfiles) {
        const userId = seedId(profile.key);
        await db.user.create({
          data: {
            id: userId,
            email: profile.email,
            passwordHash: demoPasswordHash(profile.key, profile.password),
            displayName: profile.name,
            baseCurrency: 'RUB',
            timeZone: 'Europe/Moscow',
            themePreference: 'light',
            ...timestamps,
          },
        });
        for (const template of categoryTemplates) {
          const { key, ...fields } = template;
          const category = await db.category.create({
            data: {
              id: seedId(`${profile.key}:category:${key}`),
              userId,
              ...fields,
              ...timestamps,
            },
          });
          const entry = {
            id: seedId(`audit:${profile.key}:category:${key}:create`),
            userId,
            entityType: 'Category' as const,
            entityId: category.id,
            action: 'CREATE' as const,
            after: snapshot(category),
            createdAt: firstDate,
          };
          if (entry.id === completionId) completion = entry;
          else await db.auditEntry.create({ data: entry });
        }
        const rules = [
          {
            key: 'salary',
            amount: profile.salary,
            currency: 'RUB',
            rate: '1',
            day: 5,
            description: 'Зарплата за месяц',
          },
          {
            key: 'home',
            amount: profile.rent,
            currency: 'RUB',
            rate: '1',
            day: 8,
            description: 'Аренда квартиры',
          },
          {
            key: 'subscriptions',
            amount: '12.99',
            currency: 'USD',
            rate: '91.375',
            day: 12,
            description: 'Подписка на музыкальный сервис',
          },
        ] as const;
        for (const rule of rules) {
          const recurring = await db.recurringTransaction.create({
            data: {
              id: seedId(`${profile.key}:rule:${rule.key}`),
              userId,
              categoryId: seedId(`${profile.key}:category:${rule.key}`),
              type: rule.key === 'salary' ? 'INCOME' : 'EXPENSE',
              amount: rule.amount,
              currency: rule.currency,
              exchangeRate: rule.rate,
              description: rule.description,
              frequency: 'MONTHLY',
              dayOfMonth: rule.day,
              startDate: monthDate(anchor, -5, rule.day),
              nextOccurrenceDate: monthDate(anchor, -5, rule.day),
              ...timestamps,
            },
          });
          await db.auditEntry.create({
            data: {
              id: seedId(`audit:${recurring.id}:create`),
              userId,
              entityType: 'RecurringTransaction',
              entityId: recurring.id,
              action: 'CREATE',
              after: snapshot({
                ...recurring,
                categoryName: categoryTemplates.find((c) => c.key === rule.key)
                  ?.name,
              }),
              createdAt: firstDate,
            },
          });
        }
        for (let month = 0; month < 6; month++) {
          const offset = month - 5;
          for (let index = 0; index < profile.size; index++) {
            const rule = rules[index];
            const isFreelance = index === 3;
            const variableKeys = [
              'groceries',
              'dining',
              'transport',
              'travel',
            ] as const;
            const key =
              rule?.key ??
              (isFreelance ? 'freelance' : variableKeys[(index - 4) % 4]);
            if (!key) throw new Error('Не определена категория demo-операции');
            const type =
              key === 'salary' || key === 'freelance' ? 'INCOME' : 'EXPENSE';
            const date = monthDate(
              anchor,
              offset,
              rule?.day ?? (isFreelance ? 20 : 2 + ((index * 3) % 25)),
            );
            const currency =
              rule?.currency ??
              (key === 'travel' && index % 3 === 0 ? 'EUR' : 'RUB');
            const rate = rule?.rate ?? (currency === 'EUR' ? '99.625' : '1');
            const factor = ['1', '0.8', '1.15', '0.65', '1.35', '2.4'][month];
            if (!factor) throw new Error('Не определён месяц demo-операции');
            const base =
              key === 'groceries'
                ? '3400.35'
                : key === 'dining'
                  ? '2250.50'
                  : key === 'transport'
                    ? '1700.25'
                    : currency === 'EUR'
                      ? '24.75'
                      : '4100.80';
            const amount = new Prisma.Decimal(
              rule?.amount ??
                (isFreelance ? (month === 3 ? '42000' : '8500') : base),
            )
              .mul(rule || isFreelance ? '1' : factor)
              .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
            const descriptions: Record<string, string> = {
              groceries: 'Покупки продуктов на неделю',
              dining: 'Ужин в кафе',
              transport: 'Проезд и поездки на такси',
              travel: 'Билеты и поездка выходного дня',
              freelance: 'Оплата проекта по дизайну',
            };
            const transaction = await db.transaction.create({
              data: {
                id: seedId(`${profile.key}:transaction:${month}:${index}`),
                userId,
                categoryId: seedId(`${profile.key}:category:${key}`),
                type,
                amount,
                currency,
                exchangeRate: rate,
                amountInBaseCurrency: amount
                  .mul(rate)
                  .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
                description: rule?.description ?? descriptions[key] ?? key,
                transactionDate: date,
                source: rule ? 'RECURRING' : index % 5 === 0 ? 'CSV' : 'MANUAL',
                recurringTransactionId: rule
                  ? seedId(`${profile.key}:rule:${rule.key}`)
                  : null,
                recurringOccurrenceDate: rule ? date : null,
                createdAt: date,
                updatedAt: date,
              },
            });
            const categoryName = categoryTemplates.find(
              (c) => c.key === key,
            )?.name;
            await db.auditEntry.create({
              data: {
                id: seedId(`audit:${transaction.id}:create`),
                userId,
                entityType: 'Transaction',
                entityId: transaction.id,
                action: 'CREATE',
                after: snapshot({ ...transaction, categoryName }),
                createdAt: date,
              },
            });
            if (rule) {
              const before = await db.recurringTransaction.findUniqueOrThrow({
                where: { id: seedId(`${profile.key}:rule:${rule.key}`) },
              });
              const after = await db.recurringTransaction.update({
                where: { id: before.id },
                data: {
                  nextOccurrenceDate: monthDate(anchor, offset + 1, rule.day),
                  updatedAt: date,
                },
              });
              await db.auditEntry.create({
                data: {
                  id: seedId(`audit:${before.id}:advance:${month}`),
                  userId,
                  entityType: 'RecurringTransaction',
                  entityId: before.id,
                  action: 'UPDATE',
                  before: snapshot({ ...before, categoryName }),
                  after: snapshot({ ...after, categoryName }),
                  createdAt: date,
                },
              });
            }
            if (month === 4 && index === 5) {
              const after = await db.transaction.update({
                where: { id: transaction.id },
                data: {
                  description: 'Семейный ужин в кафе после поездки',
                  amount: transaction.amount.plus('450.00'),
                  amountInBaseCurrency: transaction.amount
                    .plus('450.00')
                    .mul(transaction.exchangeRate)
                    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
                  updatedAt: new Date(date.getTime() + 3600000),
                },
              });
              await db.auditEntry.create({
                data: {
                  id: seedId(`audit:${transaction.id}:update`),
                  userId,
                  entityType: 'Transaction',
                  entityId: transaction.id,
                  action: 'UPDATE',
                  before: snapshot({ ...transaction, categoryName }),
                  after: snapshot({ ...after, categoryName }),
                  createdAt: after.updatedAt,
                },
              });
            }
          }
          if (month >= 4) {
            for (const key of profile.key === 'personal'
              ? ['groceries', 'dining', 'transport']
              : ['groceries', 'dining', 'transport', 'travel', 'home']) {
              const date = monthDate(anchor, offset);
              const sum = await db.transaction.aggregate({
                where: {
                  userId,
                  categoryId: seedId(`${profile.key}:category:${key}`),
                  transactionDate: {
                    gte: date,
                    lt: monthDate(anchor, offset + 1),
                  },
                },
                _sum: { amountInBaseCurrency: true },
              });
              const spent = sum._sum.amountInBaseCurrency;
              if (!spent) throw new Error('Не найден расход для demo-бюджета');
              const ratio =
                key === 'groceries'
                  ? '0.95'
                  : key === 'dining'
                    ? '1.25'
                    : '0.65';
              const budget = await db.budget.create({
                data: {
                  id: seedId(`${profile.key}:budget:${month}:${key}`),
                  userId,
                  categoryId: seedId(`${profile.key}:category:${key}`),
                  year: date.getUTCFullYear(),
                  month: date.getUTCMonth() + 1,
                  limitAmount: spent
                    .div(ratio)
                    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
                  createdAt: date,
                  updatedAt: date,
                },
              });
              await db.auditEntry.create({
                data: {
                  id: seedId(`audit:${budget.id}:create`),
                  userId,
                  entityType: 'Budget',
                  entityId: budget.id,
                  action: 'CREATE',
                  after: snapshot({
                    ...budget,
                    categoryName: categoryTemplates.find((c) => c.key === key)
                      ?.name,
                  }),
                  createdAt: date,
                },
              });
            }
          }
        }
      }
      if (!completion)
        throw new Error('Отсутствует завершающая запись demo-набора');
      await db.auditEntry.create({ data: completion });
      return { initialized: true, anchor: anchor.toISOString().slice(0, 10) };
    },
    { timeout: 60000, maxWait: 10000 },
  );
}
