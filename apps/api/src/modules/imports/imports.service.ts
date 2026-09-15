import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Problem } from '../../common/problem.js';
import { lockOwner } from '../finance/locking.js';
import { businessDate } from '../finance/validation.js';
import { transactionSnapshot } from '../finance/serialization.js';
import { CsvStructureError, parseCsv, type CsvTable } from './csv.js';
import {
  MAX_DATA_ROWS,
  MAX_FILE_BYTES,
  analyzeRows,
  resolveColumns,
  rowFingerprint,
  type ImportAnalysis,
  type ImportOptions,
  type OwnedCategory,
} from './imports.validation.js';

function invalidFile(message: string): never {
  throw new Problem(400, 'validation_error', message, { file: [message] });
}

export function readCsvFile(file: Express.Multer.File | undefined): CsvTable {
  if (!file) invalidFile('Прикрепите CSV-файл');
  if (!/\.csv$/i.test(file.originalname))
    invalidFile('Ожидается файл с расширением .csv');
  if (file.size > MAX_FILE_BYTES || file.buffer.length > MAX_FILE_BYTES)
    invalidFile('Файл превышает допустимый размер 5 МБ');
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(file.buffer);
  } catch {
    invalidFile('Файл должен быть в кодировке UTF-8');
  }
  try {
    return parseCsv(text, MAX_DATA_ROWS);
  } catch (error) {
    if (error instanceof CsvStructureError) invalidFile(error.message);
    throw error;
  }
}

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  preview(table: CsvTable) {
    return {
      columns: table.headers,
      sampleRows: table.rows.slice(0, 20),
      totalRows: table.rows.length,
    };
  }

  private async analyze(
    db: Prisma.TransactionClient,
    userId: string,
    baseCurrency: string,
    table: CsvTable,
    options: ImportOptions,
  ): Promise<ImportAnalysis> {
    const columns = resolveColumns(table.headers, options.mapping);
    const categories = await db.category.findMany({
      where: { userId },
      select: { id: true, type: true, archivedAt: true },
    });
    const ownedCategories = new Map<string, OwnedCategory>(
      categories.map((c) => [c.id, c]),
    );
    const candidateDates = new Set<string>();
    for (const raw of table.rows) {
      const value = (raw[columns.transactionDate] ?? '').trim();
      if (businessDate.safeParse(value).success) candidateDates.add(value);
    }
    const existing = candidateDates.size
      ? await db.transaction.findMany({
          where: {
            userId,
            transactionDate: {
              in: [...candidateDates].map(
                (d) => new Date(`${d}T00:00:00.000Z`),
              ),
            },
          },
          select: {
            transactionDate: true,
            amount: true,
            currency: true,
            type: true,
            description: true,
          },
        })
      : [];
    const existingFingerprints = new Set(
      existing.map((t) =>
        rowFingerprint({
          userId,
          transactionDate: t.transactionDate.toISOString().slice(0, 10),
          amount: t.amount.toFixed(),
          currency: t.currency,
          type: t.type,
          description: t.description,
        }),
      ),
    );
    return analyzeRows({
      userId,
      table,
      columns,
      categoryMap: options.categoryMap,
      rates: options.rates,
      ownedCategories,
      baseCurrency,
      existingFingerprints,
      includeDuplicates: options.includeDuplicates,
    });
  }

  async validate(userId: string, table: CsvTable, options: ImportOptions) {
    return this.prisma.client.$transaction(
      async (db) => {
        const owner = await db.user.findUniqueOrThrow({
          where: { id: userId },
          select: { baseCurrency: true },
        });
        return toAnalysisDto(
          await this.analyze(db, userId, owner.baseCurrency, table, options),
        );
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async commit(userId: string, table: CsvTable, options: ImportOptions) {
    return this.prisma.client.$transaction(
      async (db) => {
        const owner = await lockOwner(db, userId);
        const analysis = await this.analyze(
          db,
          userId,
          owner.baseCurrency,
          table,
          options,
        );
        let imported = 0;
        if (analysis.drafts.length > 0) {
          const withIds = analysis.drafts.map((draft) => ({
            ...draft,
            id: randomUUID(),
          }));
          const created = await db.transaction.createManyAndReturn({
            data: withIds.map((draft) => ({
              id: draft.id,
              userId,
              categoryId: draft.categoryId,
              type: draft.type,
              amount: draft.amount,
              currency: draft.currency,
              exchangeRate: draft.exchangeRate,
              amountInBaseCurrency: draft.amountInBaseCurrency,
              description: draft.description,
              transactionDate: new Date(
                `${draft.transactionDate}T00:00:00.000Z`,
              ),
              source: 'CSV',
            })),
            include: { category: true },
          });
          const byId = new Map(created.map((row) => [row.id, row]));
          await db.auditEntry.createMany({
            data: withIds.map((draft) => ({
              userId,
              entityType: 'Transaction' as const,
              entityId: draft.id,
              action: 'CREATE' as const,
              before: Prisma.DbNull,
              after: transactionSnapshot(byId.get(draft.id)!),
            })),
          });
          imported = created.length;
        }
        return { ...toAnalysisDto(analysis), imported };
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  }
}

function toAnalysisDto(analysis: ImportAnalysis) {
  return {
    totalRows: analysis.totalRows,
    importableRows: analysis.importableRows,
    duplicateRows: analysis.duplicateRows,
    invalidRows: analysis.invalidRows,
    rows: analysis.results,
    unmappedCategories: analysis.unmappedCategories,
    missingRateCurrencies: analysis.missingRateCurrencies,
  };
}
