import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test } from 'node:test';
import { z } from 'zod';
import { bootstrap } from '../src/bootstrap.js';
import { databaseFixture } from './database-fixture.js';
import { SessionService } from '../src/modules/auth/session.service.js';
import { AuditWriter } from '../src/modules/audit/audit.module.js';
import { TransactionsService } from '../src/modules/transactions/transactions.service.js';
import { RecurringService } from '../src/modules/recurring/recurring.service.js';
import { SchedulerService } from '../src/modules/recurring/scheduler.service.js';
import { Clock } from '../src/modules/recurring/clock.js';
import {
  catchUpRule,
  runSchedulerTick,
  MAX_OCCURRENCES_PER_PASS,
} from '../src/modules/recurring/engine.js';
import {
  calendarDateInZone,
  clampCalendarDate,
  daysInMonth,
  nextMonthlyOccurrence,
} from '../src/modules/recurring/calendar.js';
import { createDatabaseClient } from '../src/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { seedDatabase } from '../prisma/seed-database.js';
import { seedId } from '../prisma/seed-data.js';

const exec = promisify(execFile);
const object = z.record(z.string(), z.unknown());
const json = async (r: Response) => object.parse(await r.json());
const origin = 'http://finora.test';
const bdate = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d));

// ---------------------------------------------------------------------------
// 1. Чистые календарные функции — без БД, без сети, без ожидания реальных дат.
// ---------------------------------------------------------------------------
await test('Calendar: 28/29/30/31, leap year, год и месяц rollover', () => {
  assert.equal(daysInMonth(2027, 2), 28); // не високосный
  assert.equal(daysInMonth(2028, 2), 29); // високосный (÷4)
  assert.equal(daysInMonth(1900, 2), 28); // ÷100, не ÷400 — не високосный
  assert.equal(daysInMonth(2000, 2), 29); // ÷400 — високосный
  assert.equal(daysInMonth(2027, 4), 30);
  assert.equal(daysInMonth(2027, 1), 31);

  // dayOfMonth = 31: клэмп к последнему дню, но следующий расчёт всегда
  // заново от исходного 31, а не от уже укороченной даты.
  assert.deepEqual(clampCalendarDate(2027, 2, 31), {
    year: 2027,
    month: 2,
    day: 28,
  });
  const jan31 = bdate(2027, 1, 31);
  const feb = nextMonthlyOccurrence(jan31, 31);
  assert.deepEqual(
    { y: feb.getUTCFullYear(), m: feb.getUTCMonth() + 1, d: feb.getUTCDate() },
    { y: 2027, m: 2, d: 28 },
  );
  const mar = nextMonthlyOccurrence(feb, 31);
  assert.deepEqual(
    { y: mar.getUTCFullYear(), m: mar.getUTCMonth() + 1, d: mar.getUTCDate() },
    { y: 2027, m: 3, d: 31 },
  ); // снова 31-е — не «застряло» на 28
  // Leap February: 31 января → 29 февраля 2028, затем снова 31 марта.
  const leapFeb = nextMonthlyOccurrence(bdate(2028, 1, 31), 31);
  assert.equal(leapFeb.getUTCDate(), 29);
  assert.equal(nextMonthlyOccurrence(leapFeb, 31).getUTCDate(), 31);
  // День рождения года: декабрь → январь следующего года.
  const jan = nextMonthlyOccurrence(bdate(2027, 12, 5), 5);
  assert.deepEqual(
    { y: jan.getUTCFullYear(), m: jan.getUTCMonth() + 1, d: jan.getUTCDate() },
    { y: 2028, m: 1, d: 5 },
  );
  // День 30 в апреле/июне/сентябре/ноябре не рушится, но в феврале клэмпится.
  for (const month of [4, 6, 9, 11])
    assert.equal(
      nextMonthlyOccurrence(bdate(2027, month - 1, 30), 30).getUTCDate(),
      30,
    );
});

await test('Calendar: today в IANA timeZone владельца, не в timezone контейнера', () => {
  // 2026-01-01T04:30:00Z: в Токио уже 1 января 13:30 (тот же день),
  // в Нью-Йорке ещё 31 декабря 23:30 (предыдущий день).
  const instant = new Date('2026-01-01T04:30:00.000Z');
  assert.equal(
    calendarDateInZone(instant, 'UTC').toISOString().slice(0, 10),
    '2026-01-01',
  );
  assert.equal(
    calendarDateInZone(instant, 'Asia/Tokyo').toISOString().slice(0, 10),
    '2026-01-01',
  );
  assert.equal(
    calendarDateInZone(instant, 'America/New_York').toISOString().slice(0, 10),
    '2025-12-31',
  );
  assert.equal(
    calendarDateInZone(instant, 'Europe/Berlin').toISOString().slice(0, 10),
    '2026-01-01',
  );
  // DST spring-forward (Europe/Berlin, 2027-03-28): календарная DATE не
  // зависит от wall-clock времени суток, поэтому переход не создаёт
  // дублирующую или пропущенную календарную дату.
  const beforeDst = new Date('2027-03-28T00:30:00.000Z');
  const afterDst = new Date('2027-03-28T23:30:00.000Z');
  assert.equal(
    calendarDateInZone(beforeDst, 'Europe/Berlin').toISOString().slice(0, 10),
    '2027-03-28',
  );
  assert.equal(
    calendarDateInZone(afterDst, 'Europe/Berlin').toISOString().slice(0, 10),
    '2027-03-29',
  );
});

// ---------------------------------------------------------------------------
// 2. HTTP CRUD, ownership, validation, lifecycle — настоящая PostgreSQL.
// ---------------------------------------------------------------------------
await test('Stage 8: recurring-transactions API и настоящая PostgreSQL', async (t) => {
  const fixture = await databaseFixture();
  const previous = { ...process.env };
  Object.assign(process.env, {
    DATABASE_URL: fixture.runtimeUrl,
    AUTH_SECRET: 'finora-stage8-integration-secret-at-least-32-bytes',
    AUTH_ORIGINS: origin,
    AUTH_COOKIE_SECURE: 'false',
  });
  const app = await bootstrap(0);
  const db = fixture.client;
  const base = `${await app.getUrl()}/api/v1`;
  try {
    await seedDatabase(db, '2026-09-01');
    const owner = seedId('personal');
    const groceries = seedId('personal:category:groceries');
    const salary = seedId('personal:category:salary');
    const foreignRule = seedId('family:rule:salary');
    const token = await app.get(SessionService).sign(owner);
    const request = (
      path: string,
      method = 'GET',
      body?: unknown,
      cookie = `finora_session=${token}`,
    ) =>
      fetch(`${base}${path}`, {
        method,
        headers: {
          Origin: origin,
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    const recurring = app.get(RecurringService);
    const input = {
      amount: '3500.00',
      currency: 'RUB',
      categoryId: groceries,
      type: 'EXPENSE' as const,
      description: 'Абонемент в спортзал',
      startDate: '2026-11-05',
    };
    await t.test(
      'CREATE выводит dayOfMonth из startDate; GET/LIST/audit корректны',
      async () => {
        const r = await request('/recurring-transactions', 'POST', input);
        assert.equal(r.status, 201, await r.clone().text());
        const row = await json(r);
        assert.equal(row.dayOfMonth, 5);
        assert.equal(row.nextOccurrenceDate, '2026-11-05');
        assert.equal(row.startDate, '2026-11-05');
        assert.equal(row.hasGeneratedTransactions, false);
        assert.equal(
          (await request(`/recurring-transactions/${row.id as string}`)).status,
          200,
        );
        const audit = await db.auditEntry.findMany({
          where: { userId: owner, entityId: row.id as string },
        });
        assert.equal(audit.length, 1);
        assert.equal(audit[0]!.action, 'CREATE');
        assert.equal(audit[0]!.before, null);
      },
    );
    await t.test(
      'Validation: endDate раньше startDate, архивная/чужая/неверный тип категории, mass assignment',
      async () => {
        const cat = await db.category.update({
          where: { id: seedId('personal:category:travel') },
          data: { archivedAt: new Date() },
        });
        for (const body of [
          { ...input, endDate: '2026-10-01' },
          { ...input, categoryId: cat.id },
          { ...input, categoryId: salary }, // EXPENSE vs INCOME-категория
          { ...input, categoryId: seedId('family:category:groceries') },
          { ...input, startDate: '2026-13-40' },
          { ...input, dayOfMonth: 5 }, // не входит в create DTO
          { ...input, id: 'x' },
          { ...input, nextOccurrenceDate: '2020-01-01' },
        ])
          assert.equal(
            (await request('/recurring-transactions', 'POST', body)).status,
            400,
            JSON.stringify(body),
          );
        assert.equal(
          (await request('/recurring-transactions', 'POST', input, '')).status,
          401,
        );
      },
    );
    await t.test(
      'Ownership: чужое правило и несуществующий id дают 404',
      async () => {
        for (const method of ['GET', 'PATCH', 'DELETE'])
          assert.equal(
            (
              await request(
                `/recurring-transactions/${foreignRule}`,
                method,
                method === 'PATCH' ? { description: 'x' } : undefined,
              )
            ).status,
            404,
          );
        assert.equal(
          (await request('/recurring-transactions/not-a-uuid')).status,
          400,
        );
      },
    );
    await t.test(
      'DELETE: hard delete до первой генерации, архивирование после',
      async () => {
        const created = await recurring.create(owner, input);
        const del1 = await json(
          await request(`/recurring-transactions/${created.id}`, 'DELETE'),
        );
        assert.equal(del1.outcome, 'deleted');
        assert.equal(
          (await request(`/recurring-transactions/${created.id}`)).status,
          404,
        );
        const generated = await recurring.create(owner, input);
        // Помечаем правило как уже породившее операцию напрямую в БД, не
        // дожидаясь scheduler — проверяем именно ветку hasGenerated().
        await db.transaction.create({
          data: {
            userId: owner,
            categoryId: groceries,
            type: 'EXPENSE',
            amount: '1',
            currency: 'RUB',
            exchangeRate: '1',
            amountInBaseCurrency: '1',
            description: generated.description,
            transactionDate: new Date('2026-11-05T00:00:00Z'),
            source: 'RECURRING',
            recurringTransactionId: generated.id,
            recurringOccurrenceDate: new Date('2026-11-05T00:00:00Z'),
          },
        });
        const del2 = await json(
          await request(`/recurring-transactions/${generated.id}`, 'DELETE'),
        );
        assert.equal(del2.outcome, 'archived');
        assert.ok((await recurring.get(owner, generated.id)).archivedAt);
        // Повторное удаление уже архивного правила — идемпотентно.
        assert.equal(
          (
            await json(
              await request(
                `/recurring-transactions/${generated.id}`,
                'DELETE',
              ),
            )
          ).outcome,
          'archived',
        );
      },
    );
    await t.test('Архивное правило нельзя редактировать (409)', async () => {
      const created = await recurring.create(owner, input);
      await recurring.remove(owner, created.id); // hard delete (без генераций)
      const again = await recurring.create(owner, input);
      await db.recurringTransaction.update({
        where: { id: again.id },
        data: { archivedAt: new Date() },
      });
      assert.equal(
        (
          await request(`/recurring-transactions/${again.id}`, 'PATCH', {
            amount: '10',
          })
        ).status,
        409,
      );
    });
  } finally {
    Object.assign(process.env, previous);
    for (const key of Object.keys(process.env))
      if (!(key in previous)) delete process.env[key];
    await app.close();
    await fixture.close();
  }
});

// ---------------------------------------------------------------------------
// 3. Scheduler engine: catch-up, exhaustion, dayOfMonth reschedule,
//    deleted-occurrence protection, category-archive self-heal.
// ---------------------------------------------------------------------------
await test('Stage 8: scheduler engine — catch-up, idempotency, lifecycle', async (t) => {
  const fixture = await databaseFixture();
  const previous = { ...process.env };
  Object.assign(process.env, {
    DATABASE_URL: fixture.runtimeUrl,
    AUTH_SECRET: 'finora-stage8-scheduler-secret-at-least-32-bytes',
    AUTH_ORIGINS: origin,
    AUTH_COOKIE_SECURE: 'false',
  });
  const app = await bootstrap(0);
  const db = fixture.client;
  try {
    await seedDatabase(db, '2026-09-01');
    // Seed уже содержит 6 активных recurring правил с собственным долгом —
    // архивируем их, чтобы широкий scheduler.tick()/runSchedulerTick() в этом
    // наборе тестов детерминированно затрагивал только правила конкретного
    // сценария, а не фоновый seed-долг.
    await db.recurringTransaction.updateMany({
      data: { archivedAt: new Date('2020-01-01T00:00:00.000Z') },
    });
    const owner = seedId('personal');
    const groceries = seedId('personal:category:groceries');
    const recurring = app.get(RecurringService);
    const scheduler = app.get(SchedulerService);
    const clock = app.get(Clock);
    const audit = app.get(AuditWriter);
    const prismaService = app.get(PrismaService);

    await t.test(
      'Один due occurrence: Transaction + audit + advance',
      async () => {
        clock.setOverride(new Date('2026-11-05T09:00:00.000Z'));
        const rule = await recurring.create(owner, {
          amount: '1500',
          currency: 'RUB',
          categoryId: groceries,
          type: 'EXPENSE',
          description: 'Ежемесячная подписка',
          startDate: '2026-11-05',
        });
        const result = await scheduler.tick();
        assert.equal(result.occurrences, 1);
        const created = await db.transaction.findFirst({
          where: { recurringTransactionId: rule.id },
        });
        assert.ok(created);
        assert.equal(created.source, 'RECURRING');
        assert.equal(
          created.transactionDate.toISOString().slice(0, 10),
          '2026-11-05',
        );
        const after = await db.recurringTransaction.findUniqueOrThrow({
          where: { id: rule.id },
        });
        assert.equal(
          after.nextOccurrenceDate.toISOString().slice(0, 10),
          '2026-12-05',
        );
        const entries = await db.auditEntry.findMany({
          where: { userId: owner, entityId: rule.id },
          orderBy: { createdAt: 'asc' },
        });
        assert.deepEqual(
          entries.map((e) => e.action),
          ['CREATE', 'UPDATE'],
        );
        // Повторный тик на ту же минуту не создаёт вторую операцию.
        const again = await scheduler.tick();
        assert.equal(again.occurrences, 0);
        assert.equal(
          await db.transaction.count({
            where: { recurringTransactionId: rule.id },
          }),
          1,
        );
      },
    );

    await t.test(
      'Catch-up после downtime: N пропущенных occurrence обрабатываются одним tick, без дублей и пропусков',
      async () => {
        clock.setOverride(new Date('2026-09-05T09:00:00.000Z'));
        const rule = await recurring.create(owner, {
          amount: '1000',
          currency: 'RUB',
          categoryId: groceries,
          type: 'EXPENSE',
          description: 'Копится долг',
          startDate: '2026-09-05',
        });
        // «Downtime»: часы перевели на 6 месяцев вперёд без промежуточных tick.
        clock.setOverride(new Date('2027-03-04T09:00:00.000Z'));
        const count = await catchUpRule(
          prismaService,
          audit,
          owner,
          rule.id,
          clock.now(),
        );
        assert.equal(count, 6); // сен..фев обработаны, мар ещё не наступил
        const dates = (
          await db.transaction.findMany({
            where: { recurringTransactionId: rule.id },
            orderBy: { transactionDate: 'asc' },
          })
        ).map((t) => t.transactionDate.toISOString().slice(0, 10));
        assert.deepEqual(dates, [
          '2026-09-05',
          '2026-10-05',
          '2026-11-05',
          '2026-12-05',
          '2027-01-05',
          '2027-02-05',
        ]);
        const after = await db.recurringTransaction.findUniqueOrThrow({
          where: { id: rule.id },
        });
        assert.equal(
          after.nextOccurrenceDate.toISOString().slice(0, 10),
          '2027-03-05',
        );
        // Повторный catch-up на ту же дату — идемпотентен, не теряет и не дублирует.
        const repeat = await catchUpRule(
          prismaService,
          audit,
          owner,
          rule.id,
          clock.now(),
        );
        assert.equal(repeat, 0);
        assert.equal(
          await db.transaction.count({
            where: { recurringTransactionId: rule.id },
          }),
          6,
        );
      },
    );

    await t.test(
      'endDate: последняя occurrence обрабатывается, затем правило архивируется',
      async () => {
        clock.setOverride(new Date('2026-10-01T00:00:00.000Z'));
        const rule = await recurring.create(owner, {
          amount: '200',
          currency: 'RUB',
          categoryId: groceries,
          type: 'EXPENSE',
          description: 'Ограниченная подписка',
          startDate: '2026-10-10',
          endDate: '2026-11-10',
        });
        clock.setOverride(new Date('2027-01-01T00:00:00.000Z'));
        await scheduler.tick();
        const after = await db.recurringTransaction.findUniqueOrThrow({
          where: { id: rule.id },
        });
        assert.ok(after.archivedAt);
        assert.equal(
          await db.transaction.count({
            where: { recurringTransactionId: rule.id },
          }),
          2, // 2026-10-10 и 2026-11-10 включительно; 12-10 уже позже endDate
        );
        const auditActions = (
          await db.auditEntry.findMany({
            where: { userId: owner, entityId: rule.id },
            orderBy: { createdAt: 'asc' },
          })
        ).map((e) => e.action);
        assert.deepEqual(auditActions, ['CREATE', 'UPDATE', 'ARCHIVE']);
      },
    );

    await t.test(
      'Удалённая generated transaction не воссоздаётся при пересчёте расписания',
      async () => {
        clock.setOverride(new Date('2026-10-01T00:00:00.000Z'));
        const rule = await recurring.create(owner, {
          amount: '300',
          currency: 'RUB',
          categoryId: groceries,
          type: 'EXPENSE',
          description: 'Проверка защиты от повторной генерации',
          startDate: '2026-10-15',
        });
        clock.setOverride(new Date('2026-10-20T00:00:00.000Z'));
        await scheduler.tick();
        const generated = await db.transaction.findFirstOrThrow({
          where: { recurringTransactionId: rule.id },
        });
        const transactions = app.get(TransactionsService);
        await transactions.remove(owner, generated.id);
        assert.equal(
          await db.transaction.count({
            where: { recurringTransactionId: rule.id },
          }),
          0,
        );
        // Гипотетический сбой пересчёта: указатель вручную возвращён на уже
        // обработанную и с тех пор удалённую дату (то, от чего защищает
        // audit-история, а не текущая generated transaction).
        await db.recurringTransaction.update({
          where: { id: rule.id },
          data: { nextOccurrenceDate: new Date('2026-10-15T00:00:00Z') },
        });
        clock.setOverride(new Date('2026-10-21T00:00:00.000Z'));
        await scheduler.tick();
        assert.equal(
          await db.transaction.count({
            where: { recurringTransactionId: rule.id },
          }),
          0,
        );
        const after = await db.recurringTransaction.findUniqueOrThrow({
          where: { id: rule.id },
        });
        // Указатель всё равно продвинулся — occurrence считается обработанной.
        assert.equal(
          after.nextOccurrenceDate.toISOString().slice(0, 10),
          '2026-11-15',
        );
      },
    );

    await t.test(
      'Смена dayOfMonth: catch-up по старым параметрам ПЕРЕД применением нового расписания',
      async () => {
        clock.setOverride(new Date('2026-09-05T00:00:00.000Z'));
        const rule = await recurring.create(owner, {
          amount: '500',
          currency: 'RUB',
          categoryId: groceries,
          type: 'EXPENSE',
          description: 'Меняем день начисления',
          startDate: '2026-09-05',
        });
        // Долг накопился, пока правило не обрабатывалось.
        clock.setOverride(new Date('2026-12-01T00:00:00.000Z'));
        await recurring.update(owner, rule.id, { dayOfMonth: 20 });
        const generatedUnderOldSchedule = (
          await db.transaction.findMany({
            where: { recurringTransactionId: rule.id },
            orderBy: { transactionDate: 'asc' },
          })
        ).map((t) => t.transactionDate.toISOString().slice(0, 10));
        // Три месяца долга (сен/окт/ноя) закрыты ПОД СТАРЫМ dayOfMonth=5,
        // прежде чем применилось новое расписание.
        assert.deepEqual(generatedUnderOldSchedule, [
          '2026-09-05',
          '2026-10-05',
          '2026-11-05',
        ]);
        const after = await db.recurringTransaction.findUniqueOrThrow({
          where: { id: rule.id },
        });
        assert.equal(after.dayOfMonth, 20);
        // Новая дата строго в будущем и уже по новому dayOfMonth=20.
        assert.equal(
          after.nextOccurrenceDate.toISOString().slice(0, 10),
          '2026-12-20',
        );
      },
    );

    await t.test(
      'Категория архивируется одновременно с активным правилом (self-heal при рассинхронизации)',
      async () => {
        clock.setOverride(new Date('2026-10-01T00:00:00.000Z'));
        const rule = await recurring.create(owner, {
          amount: '400',
          currency: 'RUB',
          categoryId: groceries,
          type: 'EXPENSE',
          description: 'Категория архивируется в обход cascade',
          startDate: '2026-10-05',
        });
        // Прямая рассинхронизация в обход CategoriesService (защитный сценарий).
        await db.category.update({
          where: { id: groceries },
          data: { archivedAt: new Date('2026-10-02T00:00:00Z') },
        });
        clock.setOverride(new Date('2026-10-10T00:00:00.000Z'));
        await scheduler.tick();
        assert.equal(
          await db.transaction.count({
            where: { recurringTransactionId: rule.id },
          }),
          0,
        );
        const after = await db.recurringTransaction.findUniqueOrThrow({
          where: { id: rule.id },
        });
        assert.ok(after.archivedAt);
        await db.category.update({
          where: { id: groceries },
          data: { archivedAt: null },
        });
      },
    );

    await t.test(
      `Catch-up ограничен ${MAX_OCCURRENCES_PER_PASS} occurrence за проход; остаток — следующим tick`,
      async () => {
        clock.setOverride(new Date('2010-01-05T00:00:00.000Z'));
        const rule = await recurring.create(owner, {
          amount: '10',
          currency: 'RUB',
          categoryId: groceries,
          type: 'EXPENSE',
          description: 'Очень старый долг',
          startDate: '2010-01-05',
        });
        clock.setOverride(new Date('2026-09-01T00:00:00.000Z')); // >60 месяцев долга
        const first = await catchUpRule(
          prismaService,
          audit,
          owner,
          rule.id,
          clock.now(),
        );
        assert.equal(first, MAX_OCCURRENCES_PER_PASS);
        const stillActive = await db.recurringTransaction.findUniqueOrThrow({
          where: { id: rule.id },
        });
        assert.equal(stillActive.archivedAt, null);
        const second = await catchUpRule(
          prismaService,
          audit,
          owner,
          rule.id,
          clock.now(),
        );
        assert.ok(second > 0); // остаток долга продолжает обрабатываться
      },
    );

    await t.test(
      'runSchedulerTick: несколько due правил разных пользователей обрабатываются в одном проходе, изолированно',
      async () => {
        // Изолируем сценарий от долга, оставленного предыдущими подтестами
        // (в частности, от ещё не полностью погашенного MAX_OCCURRENCES_PER_PASS
        // правила) — иначе оно тоже попадёт в кандидаты этого tick.
        await db.recurringTransaction.updateMany({
          data: { archivedAt: new Date('2020-01-01T00:00:00.000Z') },
        });
        clock.setOverride(new Date('2026-11-05T09:00:00.000Z'));
        const other = seedId('family');
        const familyGroceries = seedId('family:category:groceries');
        const ruleA = await recurring.create(owner, {
          amount: '111',
          currency: 'RUB',
          categoryId: groceries,
          type: 'EXPENSE',
          description: 'Мульти-tick: правило A (owner)',
          startDate: '2026-11-05',
        });
        const ruleB = await recurring.create(owner, {
          amount: '222',
          currency: 'RUB',
          categoryId: groceries,
          type: 'EXPENSE',
          description:
            'Мульти-tick: правило B (owner), второе due того же пользователя',
          startDate: '2026-11-05',
        });
        const ruleC = await recurring.create(other, {
          amount: '333',
          currency: 'RUB',
          categoryId: familyGroceries,
          type: 'EXPENSE',
          description: 'Мульти-tick: правило C (другой пользователь)',
          startDate: '2026-11-05',
        });
        const result = await scheduler.tick();
        assert.equal(result.rulesProcessed, 3);
        assert.equal(result.occurrences, 3);
        assert.equal(result.failed, 0);
        for (const [rule, expectedOwner] of [
          [ruleA, owner],
          [ruleB, owner],
          [ruleC, other],
        ] as const) {
          const rows = await db.transaction.findMany({
            where: { recurringTransactionId: rule.id },
          });
          assert.equal(rows.length, 1, rule.id);
          assert.equal(rows[0]!.userId, expectedOwner, rule.id);
        }
        // Изоляция: ни одна из трёх occurrence не попала не тому владельцу
        // (recurringTransactionId → userId соответствует создателю правила).
        assert.equal(
          await db.transaction.count({
            where: {
              recurringTransactionId: { in: [ruleA.id, ruleB.id] },
              userId: other,
            },
          }),
          0,
        );
        assert.equal(
          await db.transaction.count({
            where: { recurringTransactionId: ruleC.id, userId: owner },
          }),
          0,
        );
      },
    );
  } finally {
    Object.assign(process.env, previous);
    for (const key of Object.keys(process.env))
      if (!(key in previous)) delete process.env[key];
    await app.close();
    await fixture.close();
  }
});

// ---------------------------------------------------------------------------
// 4. Concurrency: два независимых прохода на одном процессе (два PrismaClient)
//    и два действительно независимых OS-процесса — ровно один Transaction.
// ---------------------------------------------------------------------------
await test('Stage 8: multi-worker/multi-process concurrency — ровно один Transaction на occurrence', async (t) => {
  const fixture = await databaseFixture();
  const previous = { ...process.env };
  Object.assign(process.env, {
    DATABASE_URL: fixture.runtimeUrl,
    AUTH_SECRET: 'finora-stage8-concurrency-secret-at-least-32-bytes',
    AUTH_ORIGINS: origin,
    AUTH_COOKIE_SECURE: 'false',
  });
  const app = await bootstrap(0);
  const db = fixture.client;
  try {
    await seedDatabase(db, '2026-09-01');
    // См. пояснение в предыдущем наборе: изолируем сценарий от seed-долга,
    // чтобы aggregate occurrences/failed были точными для конкретного правила.
    await db.recurringTransaction.updateMany({
      data: { archivedAt: new Date('2020-01-01T00:00:00.000Z') },
    });
    const owner = seedId('personal');
    const groceries = seedId('personal:category:groceries');
    const recurring = app.get(RecurringService);
    const clock = app.get(Clock);
    const now = new Date('2026-11-05T09:00:00.000Z');
    // RecurringService.update() читает this.clock.now() (не явный now-параметр,
    // как runSchedulerTick) для catch-up ПЕРЕД patch и для today; без override
    // используется реальное время, что делает нашу «due» occurrence не due
    // с точки зрения update() и ломает гонку scheduler vs edit ниже.
    clock.setOverride(now);

    await t.test(
      'Два одновременных runSchedulerTick (независимые PrismaClient, тот же процесс)',
      async () => {
        await recurring.create(owner, {
          amount: '750',
          currency: 'RUB',
          categoryId: groceries,
          type: 'EXPENSE',
          description: 'Гонка двух воркеров в одном процессе',
          startDate: '2026-11-05',
        });
        const clientA = createDatabaseClient(fixture.runtimeUrl);
        const clientB = createDatabaseClient(fixture.runtimeUrl);
        const auditA = new AuditWriter();
        const auditB = new AuditWriter();
        try {
          const [a, b] = await Promise.all([
            runSchedulerTick(
              { client: clientA } as unknown as PrismaService,
              auditA,
              now,
            ),
            runSchedulerTick(
              { client: clientB } as unknown as PrismaService,
              auditB,
              now,
            ),
          ]);
          assert.equal(a.occurrences + b.occurrences, 1);
          assert.equal(a.failed, 0);
          assert.equal(b.failed, 0);
        } finally {
          await clientA.$disconnect();
          await clientB.$disconnect();
        }
      },
    );

    // Stage 8 gate: явная матрица 1 / 2 / 4 независимых OS-процессов —
    // 2-процессный случай не выводится из 4-процессного (разные точки
    // серилизации могут вести себя по-разному при разном числе конкурентов),
    // поэтому проверяется отдельным реальным прогоном той же methodology
    // (`recurring-scheduler-worker.ts`, настоящий `child_process`, без общего
    // JS-состояния), а не аргументом «4 сильнее, значит 2 тоже пройдёт».
    for (const { count, label, verb } of [
      { count: 1, label: '1 независимый OS-процесс', verb: 'запускает' },
      { count: 2, label: '2 независимых OS-процесса', verb: 'запускают' },
      { count: 4, label: '4 независимых OS-процесса', verb: 'запускают' },
    ]) {
      await t.test(
        `${label} ${verb} tick одновременно на одно due правило — ровно один Transaction, 0 дублей, 0 пропусков, retries=0`,
        async () => {
          const rule = await recurring.create(owner, {
            amount: String(900 + count),
            currency: 'RUB',
            categoryId: groceries,
            type: 'EXPENSE',
            description: `Матрица конкурентности: ${label}`,
            startDate: '2026-11-05',
          });
          const workers = Array.from({ length: count }, () =>
            exec('node', [
              'dist-test/test/recurring-scheduler-worker.js',
              fixture.runtimeUrl,
              now.toISOString(),
            ]),
          );
          const results = await Promise.all(workers);
          let occurrences = 0;
          for (const r of results) {
            assert.equal(
              r.stderr,
              '',
              `${label}: worker stderr должен быть пуст`,
            );
            const parsed = JSON.parse(r.stdout) as {
              occurrences: number;
              failed: number;
            };
            // failed=0 у каждого worker — ни один не столкнулся с ошибкой
            // (в engine.ts нет retry-логики: либо чистый успех в рамках
            // своей DB transaction, либо контролируемый провал попытки).
            assert.equal(parsed.failed, 0, `${label}: retries/failed = 0`);
            occurrences += parsed.occurrences;
          }
          // Сумма occurrences по всем worker равна ровно одному — конкуренты,
          // не выигравшие блокировку, корректно увидели уже обработанную
          // occurrence (alreadyGenerated) и не создали ни дубль, ни пропуск.
          assert.equal(
            occurrences,
            1,
            `${label}: суммарно ровно одна occurrence обработана`,
          );
          assert.equal(
            await db.transaction.count({
              where: { recurringTransactionId: rule.id },
            }),
            1,
            `${label}: ровно одна Transaction в БД, без дублей`,
          );
          const after = await db.recurringTransaction.findUniqueOrThrow({
            where: { id: rule.id },
          });
          assert.equal(
            after.nextOccurrenceDate.toISOString().slice(0, 10),
            '2026-12-05',
            `${label}: указатель корректно продвинут`,
          );
        },
      );
    }

    await t.test(
      'Гонка scheduler vs DELETE ещё не сгенерированного правила: инвариант "правило с фактом генерации не удаляется физически" держится независимо от порядка',
      async () => {
        const rule = await recurring.create(owner, {
          amount: '450',
          currency: 'RUB',
          categoryId: groceries,
          type: 'EXPENSE',
          description: 'Гонка scheduler и DELETE на первой occurrence',
          startDate: '2026-11-05',
        });
        const clientA = createDatabaseClient(fixture.runtimeUrl);
        const auditA = new AuditWriter();
        try {
          // Обе стороны сначала берут FOR UPDATE на строку users того же
          // владельца (lockOwner) — это и есть общая точка сериализации,
          // независимая от отдельной блокировки строки правила.
          const [tickResult, removeResult] = await Promise.allSettled([
            runSchedulerTick(
              { client: clientA } as unknown as PrismaService,
              auditA,
              now,
            ),
            recurring.remove(owner, rule.id),
          ]);
          assert.equal(tickResult.status, 'fulfilled');
          assert.equal(removeResult.status, 'fulfilled');
          const generated = await db.transaction.count({
            where: { recurringTransactionId: rule.id },
          });
          const stillExists = await db.recurringTransaction.findUnique({
            where: { id: rule.id },
          });
          if (generated === 1) {
            // Scheduler закоммитил первым: DELETE увидел hasGenerated=true
            // и заархивировал правило вместо физического удаления.
            assert.ok(stillExists?.archivedAt);
            assert.equal(
              removeResult.status === 'fulfilled' && removeResult.value.outcome,
              'archived',
            );
          } else {
            // DELETE закоммитил первым: правило физически удалено, tick не
            // создал orphan-операцию на уже не существующее правило.
            assert.equal(stillExists, null);
            assert.equal(generated, 0);
            assert.equal(
              removeResult.status === 'fulfilled' && removeResult.value.outcome,
              'deleted',
            );
          }
        } finally {
          await clientA.$disconnect();
        }
      },
    );

    await t.test(
      'Гонка scheduler vs PATCH (RecurringService.update) на ещё не сгенерированной occurrence: ровно один Transaction, независимо от порядка',
      async () => {
        const rule = await recurring.create(owner, {
          amount: '600',
          currency: 'RUB',
          categoryId: groceries,
          type: 'EXPENSE',
          description: 'До правки',
          startDate: '2026-11-05',
        });
        const clientA = createDatabaseClient(fixture.runtimeUrl);
        const auditA = new AuditWriter();
        try {
          // Обе стороны берут FOR UPDATE на строку users того же владельца
          // (lockOwner), затем на строку правила — тот же порядок блокировок
          // в engine.ts (processOneOccurrence) и в recurring.service.ts
          // (update()), так что независимо от того, кто выиграет гонку,
          // вторая сторона перечитывает уже актуальное состояние.
          const [tickResult, updateResult] = await Promise.allSettled([
            runSchedulerTick(
              { client: clientA } as unknown as PrismaService,
              auditA,
              now,
            ),
            recurring.update(owner, rule.id, { description: 'После правки' }),
          ]);
          assert.equal(tickResult.status, 'fulfilled');
          assert.equal(updateResult.status, 'fulfilled');
          // Ровно одна occurrence — независимо от того, чей catch-up (у
          // update() тоже есть собственный catchUpRule перед patch) её поймал.
          assert.equal(
            await db.transaction.count({
              where: { recurringTransactionId: rule.id },
            }),
            1,
          );
          const after = await db.recurringTransaction.findUniqueOrThrow({
            where: { id: rule.id },
          });
          assert.equal(after.description, 'После правки');
          assert.equal(
            after.nextOccurrenceDate.toISOString().slice(0, 10),
            '2026-12-05',
          );
        } finally {
          await clientA.$disconnect();
        }
      },
    );
  } finally {
    Object.assign(process.env, previous);
    for (const key of Object.keys(process.env))
      if (!(key in previous)) delete process.env[key];
    await app.close();
    await fixture.close();
  }
});

// ---------------------------------------------------------------------------
// 5. Crash consistency: сбой между записью Transaction и продвижением
//    nextOccurrenceDate внутри одной DB transaction (engine.ts,
//    processOneOccurrence) откатывает обе стороны атомарно. Инъекция сбоя —
//    расширение ($extends) тестового PrismaClient, тот же приём, что уже
//    используется в dashboard.test.ts («Один snapshot») — никакого test-only
//    hook в production-коде.
// ---------------------------------------------------------------------------
await test('Stage 8: crash consistency — сбой между INSERT Transaction и продвижением nextOccurrenceDate', async (t) => {
  const fixture = await databaseFixture();
  const previous = { ...process.env };
  Object.assign(process.env, {
    DATABASE_URL: fixture.runtimeUrl,
    AUTH_SECRET: 'finora-stage8-crash-secret-at-least-32-bytes',
    AUTH_ORIGINS: origin,
    AUTH_COOKIE_SECURE: 'false',
  });
  const app = await bootstrap(0);
  const db = fixture.client;
  try {
    await seedDatabase(db, '2026-09-01');
    await db.recurringTransaction.updateMany({
      data: { archivedAt: new Date('2020-01-01T00:00:00.000Z') },
    });
    const owner = seedId('personal');
    const groceries = seedId('personal:category:groceries');
    const recurring = app.get(RecurringService);
    const audit = app.get(AuditWriter);
    const now = new Date('2026-11-05T09:00:00.000Z');

    await t.test(
      'Сбой после INSERT Transaction, но до UPDATE nextOccurrenceDate: откатывается всё — ни Transaction, ни audit, ни продвинутый указатель; повтор создаёт ровно одну Transaction',
      async () => {
        const rule = await recurring.create(owner, {
          amount: '777',
          currency: 'RUB',
          categoryId: groceries,
          type: 'EXPENSE',
          description: 'Сбой внутри одной DB transaction',
          startDate: '2026-11-05',
        });
        const raw = createDatabaseClient(fixture.runtimeUrl);
        class InjectedFailure extends Error {}
        let transactionInserted = false;
        // $allOperations (не отдельные per-model хуки: с per-model формой
        // Prisma 7.10 + driver adapter молча выполняет перехваченный запрос
        // вне соединения интерактивной $transaction, из-за чего INSERT
        // переживает откат — проверено отдельным изолированным repro) —
        // тот же приём, что уже используется в dashboard.test.ts («Один
        // snapshot»).
        const faulty = raw.$extends({
          query: {
            $allModels: {
              async $allOperations({ model, operation, args, query }) {
                if (model === 'Transaction' && operation === 'create') {
                  const result = await query(args);
                  transactionInserted = true;
                  return result;
                }
                if (
                  model === 'RecurringTransaction' &&
                  operation === 'update' &&
                  transactionInserted
                )
                  throw new InjectedFailure(
                    'Инъекция сбоя между INSERT Transaction и UPDATE nextOccurrenceDate',
                  );
                return query(args);
              },
            },
          },
        });
        try {
          const faultyResult = await runSchedulerTick(
            { client: faulty } as unknown as PrismaService,
            audit,
            now,
          );
          // runSchedulerTick не пробрасывает ошибку одного правила наружу
          // (engine.ts: try/catch на кандидата), а учитывает её в failed —
          // это единственный способ узнать об ошибке снаружи в production.
          assert.equal(faultyResult.rulesProcessed, 0);
          assert.equal(faultyResult.occurrences, 0);
          assert.equal(faultyResult.failed, 1);
          // Ни Transaction, ни её audit CREATE не пережили rollback — оба были
          // записаны той же транзакцией, что и упавший UPDATE.
          assert.equal(
            await db.transaction.count({
              where: { recurringTransactionId: rule.id },
            }),
            0,
          );
          // entityId: rule.id уже содержит легитимную audit CREATE-запись
          // самого правила (от recurring.create() выше, до инъекции) — она
          // не относится к откату и не должна быть исключена отсюда.
          // Проверяем именно то, что откатывается вместе с Transaction:
          // audit UPDATE/ARCHIVE указателя (последняя запись в
          // processOneOccurrence, в одной transaction с несостоявшимся INSERT).
          assert.equal(
            await db.auditEntry.count({
              where: {
                userId: owner,
                entityId: rule.id,
                action: { in: ['UPDATE', 'ARCHIVE'] },
              },
            }),
            0,
          );
          // Указатель правила не продвинут — occurrence всё ещё due.
          const untouched = await db.recurringTransaction.findUniqueOrThrow({
            where: { id: rule.id },
          });
          assert.equal(
            untouched.nextOccurrenceDate.toISOString().slice(0, 10),
            '2026-11-05',
          );
        } finally {
          await raw.$disconnect();
        }
        // Без инъекции: повтор на том же правиле создаёт ровно одну Transaction
        // и корректно продвигает указатель — сбой не оставил half-state,
        // мешающего нормальной обработке.
        const clean = await runSchedulerTick(
          app.get(PrismaService),
          audit,
          now,
        );
        assert.equal(clean.occurrences, 1);
        assert.equal(clean.failed, 0);
        assert.equal(
          await db.transaction.count({
            where: { recurringTransactionId: rule.id },
          }),
          1,
        );
        const advanced = await db.recurringTransaction.findUniqueOrThrow({
          where: { id: rule.id },
        });
        assert.equal(
          advanced.nextOccurrenceDate.toISOString().slice(0, 10),
          '2026-12-05',
        );
        // Повтор на ту же occurrence не создаёт дубль.
        const again = await runSchedulerTick(
          app.get(PrismaService),
          audit,
          now,
        );
        assert.equal(again.occurrences, 0);
        assert.equal(
          await db.transaction.count({
            where: { recurringTransactionId: rule.id },
          }),
          1,
        );
      },
    );
  } finally {
    Object.assign(process.env, previous);
    for (const key of Object.keys(process.env))
      if (!(key in previous)) delete process.env[key];
    await app.close();
    await fixture.close();
  }
});
