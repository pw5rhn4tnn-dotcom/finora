import { Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { AuditWriter } from '../audit/audit.module.js';
import { lockOwner } from '../finance/locking.js';
import { financialSnapshot } from '../finance/money.js';
import {
  recurringSnapshot,
  transactionSnapshot,
} from '../finance/serialization.js';
import { errorDiagnostics } from '../../infrastructure/error-diagnostics.js';
import {
  businessDateString,
  calendarDateInZone,
  nextMonthlyOccurrence,
} from './calendar.js';

const logger = new Logger('RecurringEngine');

// Ограничивает объём работы одного tick/catch-up на одно правило: пропущенные
// occurrence не теряются — оставшийся долг обрабатывается следующим проходом.
// 60 occurrence — 5 лет ежемесячных пропусков за один проход; достаточный
// запас для реалистичного downtime, не притворяющийся SLA.
export const MAX_OCCURRENCES_PER_PASS = 60;

export type OccurrenceOutcome = 'stopped' | 'advanced' | 'exhausted';

// Уже сгенерированная (и, возможно, впоследствии удалённая пользователем)
// occurrence не должна создаваться повторно: отдельной occurrence-таблицы нет
// (ARCHITECTURE §14), поэтому источник истины — неизменяемый audit CREATE.
async function alreadyGenerated(
  db: Prisma.TransactionClient,
  userId: string,
  ruleId: string,
  occurrenceDate: string,
): Promise<boolean> {
  const entry = await db.auditEntry.findFirst({
    where: {
      userId,
      entityType: 'Transaction',
      action: 'CREATE',
      AND: [
        { after: { path: ['recurringTransactionId'], equals: ruleId } },
        {
          after: { path: ['recurringOccurrenceDate'], equals: occurrenceDate },
        },
      ],
    },
    select: { id: true },
  });
  return !!entry;
}

// Обрабатывает не более одной occurrence правила в одной короткой DB
// transaction: блокировка пользователя → блокировка правила → повторная
// проверка активности/даты/категории → создание Transaction(source=RECURRING)
// + audit CREATE → продвижение nextOccurrenceDate + audit UPDATE/ARCHIVE.
// Всё фиксируется вместе; ошибка откатывает и запись, и указатель.
async function processOneOccurrence(
  prisma: PrismaService,
  audit: AuditWriter,
  userId: string,
  ruleId: string,
  now: Date,
): Promise<OccurrenceOutcome> {
  return prisma.client.$transaction(async (db) => {
    const owner = await lockOwner(db, userId);
    await db.$queryRaw`SELECT id FROM recurring_transactions WHERE id = ${ruleId}::uuid AND "userId" = ${userId}::uuid FOR UPDATE`;
    const rule = await db.recurringTransaction.findFirst({
      where: { id: ruleId, userId },
      include: { category: true },
    });
    if (!rule || rule.archivedAt) return 'stopped';
    const today = calendarDateInZone(now, owner.timeZone);
    if (rule.nextOccurrenceDate > today) return 'stopped';
    if (rule.category.archivedAt) {
      // Защитный self-heal: категория архивируется вместе с активными
      // правилами атомарно (CategoriesService), поэтому в норме сюда не
      // попадаем; на случай рассинхронизации деактивируем правило сами.
      const updated = await db.recurringTransaction.update({
        where: { id: rule.id, userId },
        data: { archivedAt: now },
      });
      await audit.write(
        db,
        userId,
        'RecurringTransaction',
        rule.id,
        'ARCHIVE',
        recurringSnapshot(rule, rule.category.name),
        recurringSnapshot(updated, rule.category.name),
      );
      return 'exhausted';
    }
    const occurrenceDate = rule.nextOccurrenceDate;
    const occurrenceDateStr = businessDateString(occurrenceDate);
    if (!(await alreadyGenerated(db, userId, rule.id, occurrenceDateStr))) {
      const money = financialSnapshot(
        rule.amount.toFixed(),
        rule.currency,
        owner.baseCurrency,
        rule.exchangeRate.toFixed(),
      );
      try {
        const row = await db.transaction.create({
          data: {
            userId,
            categoryId: rule.categoryId,
            type: rule.type,
            currency: rule.currency,
            ...money,
            description: rule.description,
            transactionDate: occurrenceDate,
            source: 'RECURRING',
            recurringTransactionId: rule.id,
            recurringOccurrenceDate: occurrenceDate,
          },
          include: { category: true },
        });
        await audit.write(
          db,
          userId,
          'Transaction',
          row.id,
          'CREATE',
          null,
          transactionSnapshot(row),
        );
      } catch (error) {
        // Финальная защита БД: конкурентный процесс успел создать ту же
        // occurrence между нашей проверкой и INSERT. Блокировка правила выше
        // должна была это исключить — если constraint всё же сработал,
        // считаем occurrence обработанной и просто продвигаем указатель.
        if (!(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ))
          throw error;
      }
    }
    const next = nextMonthlyOccurrence(occurrenceDate, rule.dayOfMonth);
    const exhausted = !!rule.endDate && next > rule.endDate;
    const updated = await db.recurringTransaction.update({
      where: { id: rule.id, userId },
      data: exhausted
        ? { nextOccurrenceDate: next, archivedAt: now }
        : { nextOccurrenceDate: next },
    });
    await audit.write(
      db,
      userId,
      'RecurringTransaction',
      rule.id,
      exhausted ? 'ARCHIVE' : 'UPDATE',
      recurringSnapshot(rule, rule.category.name),
      recurringSnapshot(updated, rule.category.name),
    );
    return exhausted ? 'exhausted' : 'advanced';
  });
}

// Догоняет весь накопленный долг одного правила до `now` ограниченными
// пачками. Возвращает число фактически обработанных occurrence.
export async function catchUpRule(
  prisma: PrismaService,
  audit: AuditWriter,
  userId: string,
  ruleId: string,
  now: Date,
  limit = MAX_OCCURRENCES_PER_PASS,
): Promise<number> {
  let processed = 0;
  for (let i = 0; i < limit; i++) {
    const outcome = await processOneOccurrence(
      prisma,
      audit,
      userId,
      ruleId,
      now,
    );
    if (outcome === 'stopped') break;
    processed++;
    if (outcome === 'exhausted') break;
  }
  return processed;
}

// Один проход планировщика: находит кандидатов (nextOccurrenceDate в пределах
// суток от UTC-сегодня — грубый фильтр по индексу; точная проверка «today»
// в IANA timeZone владельца выполняется внутри processOneOccurrence) и
// догоняет долг каждого правила независимо. Сбой одного правила логируется
// и не прерывает обработку остальных.
export async function runSchedulerTick(
  prisma: PrismaService,
  audit: AuditWriter,
  now: Date,
): Promise<{ rulesProcessed: number; occurrences: number; failed: number }> {
  const upperBound = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  const candidates = await prisma.client.recurringTransaction.findMany({
    where: { archivedAt: null, nextOccurrenceDate: { lte: upperBound } },
    orderBy: [{ nextOccurrenceDate: 'asc' }, { id: 'asc' }],
    select: { id: true, userId: true },
  });
  let rulesProcessed = 0;
  let occurrences = 0;
  let failed = 0;
  for (const candidate of candidates) {
    try {
      const count = await catchUpRule(
        prisma,
        audit,
        candidate.userId,
        candidate.id,
        now,
      );
      if (count > 0) rulesProcessed++;
      occurrences += count;
    } catch (error) {
      failed++;
      logger.error({
        message: 'Обработка recurring правила завершилась ошибкой',
        recurringTransactionId: candidate.id,
        ...errorDiagnostics(error),
      });
    }
  }
  return { rulesProcessed, occurrences, failed };
}
