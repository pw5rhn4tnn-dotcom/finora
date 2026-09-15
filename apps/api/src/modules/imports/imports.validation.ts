import { z } from 'zod';
import { Decimal, financialSnapshot } from '../finance/money.js';
import { Problem } from '../../common/problem.js';
import {
  businessDate,
  currency as currencyField,
  decimalPattern,
  idSchema,
  rate as rateField,
  ratePattern,
  transactionTypes,
} from '../finance/validation.js';
import type { CsvTable } from './csv.js';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_DATA_ROWS = 10_000;
// Цели маппинга — единственные поля, которые CSV может заполнить. id,
// ownerId, createdAt, source, recurring-связка и любые другие
// server-controlled поля не являются целью маппинга и не могут быть заданы
// файлом ни при каких обстоятельствах.
const mappingTargets = [
  'transactionDate',
  'type',
  'amount',
  'currency',
  'exchangeRate',
  'category',
  'description',
] as const;
export type MappingTarget = (typeof mappingTargets)[number];
export const importMappingSchema = z
  .strictObject({
    transactionDate: z.string().min(1),
    type: z.string().min(1),
    amount: z.string().min(1),
    currency: z.string().min(1),
    exchangeRate: z.string().min(1).optional(),
    category: z.string().min(1),
    description: z.string().min(1),
  })
  .superRefine((v, ctx) => {
    const used = mappingTargets
      .map((key) => v[key])
      .filter((value): value is string => value !== undefined);
    if (new Set(used).size !== used.length)
      ctx.addIssue({
        code: 'custom',
        path: ['transactionDate'],
        message: 'Каждый столбец файла можно сопоставить только одной цели',
      });
  });
export type ImportMapping = z.infer<typeof importMappingSchema>;
export const importCategoryMapSchema = z.record(z.string().min(1), idSchema);
export type ImportCategoryMap = z.infer<typeof importCategoryMapSchema>;
export const importRatesSchema = z.record(currencyField, rateField);
export type ImportRates = z.infer<typeof importRatesSchema>;
export const importOptionsSchema = z.strictObject({
  mapping: importMappingSchema,
  categoryMap: importCategoryMapSchema.default({}),
  rates: importRatesSchema.default({}),
  includeDuplicates: z.boolean().default(false),
});
export type ImportOptions = z.infer<typeof importOptionsSchema>;

export function parseJsonField<T>(
  schema: z.ZodType<T>,
  field: string,
  raw: string | undefined,
  fallback: string,
): T {
  let value: unknown;
  try {
    value = JSON.parse(raw ?? fallback);
  } catch {
    throw new Problem(400, 'validation_error', 'Некорректный JSON поля', {
      [field]: ['Ожидался корректный JSON'],
    });
  }
  const result = schema.safeParse(value);
  if (!result.success)
    throw new Problem(400, 'validation_error', 'Некорректные данные поля', {
      [field]: result.error.issues.map((issue) => issue.message),
    });
  return result.data;
}

export function resolveColumns(
  headers: string[],
  mapping: ImportMapping,
): Record<MappingTarget, number> {
  const index = new Map(headers.map((header, i) => [header, i]));
  const resolved = {} as Record<MappingTarget, number>;
  for (const target of mappingTargets) {
    const column = mapping[target];
    if (column === undefined) continue;
    const at = index.get(column);
    if (at === undefined)
      throw new Problem(
        400,
        'validation_error',
        'Столбец из маппинга не найден в файле',
        { [target]: [`Столбец «${column}» отсутствует в файле`] },
      );
    resolved[target] = at;
  }
  return resolved;
}

// Непечатаемый разделитель (U+0001): не может встретиться в user-generated
// полях после normalizedDescription, поэтому конкатенация не даёт коллизий
// между соседними компонентами разной длины.
const FINGERPRINT_SEPARATOR = String.fromCharCode(1);
export function normalizedDescription(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}
export function rowFingerprint(params: {
  userId: string;
  transactionDate: string;
  amount: string;
  currency: string;
  type: string;
  description: string;
}): string {
  return [
    params.userId,
    params.transactionDate,
    new Decimal(params.amount).toFixed(),
    params.currency,
    params.type,
    normalizedDescription(params.description),
  ].join(FINGERPRINT_SEPARATOR);
}

export interface OwnedCategory {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  archivedAt: Date | null;
}
export interface ImportRowError {
  field: string;
  message: string;
}
export interface ImportRowResult {
  row: number;
  status: 'valid' | 'invalid' | 'duplicate';
  errors: ImportRowError[];
}
export interface ImportDraft {
  row: number;
  categoryId: string;
  type: 'INCOME' | 'EXPENSE';
  transactionDate: string;
  description: string;
  currency: string;
  amount: string;
  exchangeRate: string;
  amountInBaseCurrency: string;
  fingerprint: string;
}
export interface ImportAnalysis {
  totalRows: number;
  results: ImportRowResult[];
  drafts: ImportDraft[];
  importableRows: number;
  duplicateRows: number;
  invalidRows: number;
  // Собираются во время построчной validation, чтобы wizard мог показать
  // мастер сопоставления категорий/курсов, не разбирая файл повторно на
  // клиенте отдельным парсером (единственный источник истины — сервер).
  unmappedCategories: string[];
  missingRateCurrencies: string[];
}

const descriptionPattern = /[\p{Cc}]/u;

function cell(row: string[], index: number | undefined): string {
  return index === undefined ? '' : (row[index] ?? '');
}

export function analyzeRows(params: {
  userId: string;
  table: CsvTable;
  columns: Record<MappingTarget, number>;
  categoryMap: ImportCategoryMap;
  rates: ImportRates;
  ownedCategories: Map<string, OwnedCategory>;
  baseCurrency: string;
  existingFingerprints: Set<string>;
  includeDuplicates: boolean;
}): ImportAnalysis {
  const results: ImportRowResult[] = [];
  const drafts: ImportDraft[] = [];
  const seenFingerprints = new Set<string>();
  const unmappedCategories = new Set<string>();
  const missingRateCurrencies = new Set<string>();
  let duplicateRows = 0;
  let invalidRows = 0;
  params.table.rows.forEach((raw, i) => {
    const rowNumber = i + 1;
    const errors: ImportRowError[] = [];
    const fail = (field: string, message: string) =>
      errors.push({ field, message });
    const transactionDate = cell(raw, params.columns.transactionDate).trim();
    const typeRaw = cell(raw, params.columns.type).trim().toUpperCase();
    const amountRaw = cell(raw, params.columns.amount).trim();
    const currencyRaw = cell(raw, params.columns.currency).trim().toUpperCase();
    const exchangeRateRaw =
      params.columns.exchangeRate === undefined
        ? ''
        : cell(raw, params.columns.exchangeRate).trim();
    const categoryRaw = cell(raw, params.columns.category).trim();
    const description = cell(raw, params.columns.description).trim();
    if (!businessDate.safeParse(transactionDate).success)
      fail('transactionDate', 'Некорректная или отсутствующая дата ГГГГ-ММ-ДД');
    if (!(transactionTypes as readonly string[]).includes(typeRaw))
      fail('type', 'Тип должен быть INCOME или EXPENSE');
    if (!new RegExp(decimalPattern).test(amountRaw))
      fail(
        'amount',
        'Сумма должна быть десятичной строкой с точкой: без разделителей тысяч и запятой',
      );
    if (!currencyField.safeParse(currencyRaw).success)
      fail('currency', 'Неподдерживаемый код валюты');
    if (!description) fail('description', 'Пустое описание');
    else if (description.length > 500)
      fail('description', 'Описание длиннее 500 символов');
    else if (descriptionPattern.test(description))
      fail('description', 'Описание содержит управляющие символы');
    if (!categoryRaw) fail('category', 'Пустое значение категории');
    const categoryId = categoryRaw
      ? params.categoryMap[categoryRaw]
      : undefined;
    let ownedCategory: OwnedCategory | undefined;
    if (categoryRaw && !categoryId) {
      fail(
        'category',
        `Значение «${categoryRaw}» не сопоставлено с категорией`,
      );
      unmappedCategories.add(categoryRaw);
    } else if (categoryId) {
      ownedCategory = params.ownedCategories.get(categoryId);
      if (!ownedCategory) fail('category', 'Категория недоступна');
      else if (ownedCategory.archivedAt)
        fail('category', 'Архивная категория недоступна для новой связи');
      else if (
        (transactionTypes as readonly string[]).includes(typeRaw) &&
        ownedCategory.type !== typeRaw
      )
        fail('category', 'Тип категории не соответствует операции');
    }
    if (errors.length === 0) {
      const currency = currencyRaw;
      const type = typeRaw as 'INCOME' | 'EXPENSE';
      let resolvedRate: string | undefined = exchangeRateRaw || undefined;
      if (
        resolvedRate !== undefined &&
        !new RegExp(ratePattern).test(resolvedRate)
      ) {
        fail(
          'exchangeRate',
          'Курс: до 12 целых и 12 дробных знаков, больше нуля',
        );
        resolvedRate = undefined;
      } else if (
        resolvedRate === undefined &&
        currency !== params.baseCurrency
      ) {
        resolvedRate = params.rates[currency];
        if (resolvedRate === undefined) {
          fail(
            'exchangeRate',
            `Укажите курс для валюты ${currency} перед импортом`,
          );
          missingRateCurrencies.add(currency);
        }
      }
      if (errors.length === 0) {
        try {
          const money = financialSnapshot(
            amountRaw,
            currency,
            params.baseCurrency,
            resolvedRate,
          );
          const fingerprint = rowFingerprint({
            userId: params.userId,
            transactionDate,
            amount: money.amount,
            currency,
            type,
            description,
          });
          const isDuplicate =
            params.existingFingerprints.has(fingerprint) ||
            seenFingerprints.has(fingerprint);
          seenFingerprints.add(fingerprint);
          if (isDuplicate && !params.includeDuplicates) {
            duplicateRows++;
            results.push({ row: rowNumber, status: 'duplicate', errors: [] });
            return;
          }
          drafts.push({
            row: rowNumber,
            categoryId: categoryId!,
            type,
            transactionDate,
            description,
            currency,
            amount: money.amount,
            exchangeRate: money.exchangeRate,
            amountInBaseCurrency: money.amountInBaseCurrency,
            fingerprint,
          });
          results.push({ row: rowNumber, status: 'valid', errors: [] });
          return;
        } catch (error) {
          if (error instanceof Problem)
            for (const [field, messages] of Object.entries(error.errors))
              for (const message of messages) fail(field, message);
          else throw error;
        }
      }
    }
    invalidRows++;
    results.push({ row: rowNumber, status: 'invalid', errors });
  });
  return {
    totalRows: params.table.rows.length,
    results,
    drafts,
    importableRows: drafts.length,
    duplicateRows,
    invalidRows,
    unmappedCategories: [...unmappedCategories],
    missingRateCurrencies: [...missingRateCurrencies],
  };
}
