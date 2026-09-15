import type { AuditEntryDto } from '@finora/api-client';
import { dateText, moneyText } from './format';
import { iconNames } from './icon-names';
import { monthNames } from './month-names';

type Snapshot = Record<string, unknown>;
type FieldDef = {
  key: string;
  label: string;
  render: (s: Snapshot, baseCurrency: string) => string;
  present?: (s: Snapshot) => boolean;
};
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const typeLabel = (v: unknown) => (v === 'INCOME' ? 'Доход' : 'Расход');
const sourceLabel = (v: unknown) =>
  v === 'CSV'
    ? 'Импорт CSV'
    : v === 'RECURRING'
      ? 'Регулярная операция'
      : 'Вручную';
const amountField: FieldDef = {
  key: 'amount',
  label: 'Сумма',
  render: (s) => moneyText(str(s['amount']), str(s['currency'])),
};
const exchangeRateField: FieldDef = {
  key: 'exchangeRate',
  label: 'Курс',
  render: (s) => str(s['exchangeRate']),
};
const categoryField: FieldDef = {
  key: 'categoryName',
  label: 'Категория',
  render: (s) => str(s['categoryName']),
};
const descriptionField: FieldDef = {
  key: 'description',
  label: 'Описание',
  render: (s) => str(s['description']),
};
const typeField: FieldDef = {
  key: 'type',
  label: 'Тип',
  render: (s) => typeLabel(s['type']),
};
const archiveStatusField: FieldDef = {
  key: 'archivedAt',
  label: 'Статус',
  render: (s) => (s['archivedAt'] ? 'Архивная' : 'Активна'),
};
const fieldsByEntityType: Record<AuditEntryDto['entityType'], FieldDef[]> = {
  Transaction: [
    typeField,
    amountField,
    exchangeRateField,
    categoryField,
    descriptionField,
    {
      key: 'transactionDate',
      label: 'Дата операции',
      render: (s) => dateText(str(s['transactionDate'])),
    },
    {
      key: 'source',
      label: 'Источник',
      render: (s) => sourceLabel(s['source']),
    },
  ],
  Budget: [
    categoryField,
    {
      key: 'month',
      label: 'Месяц',
      present: (s) => 'year' in s && 'month' in s,
      render: (s) =>
        `${monthNames[Number(s['month']) - 1]} ${String(s['year'])}`,
    },
    {
      key: 'limitAmount',
      label: 'Лимит',
      render: (s, baseCurrency) =>
        moneyText(str(s['limitAmount']), baseCurrency),
    },
  ],
  Category: [
    { key: 'name', label: 'Название', render: (s) => str(s['name']) },
    typeField,
    {
      key: 'icon',
      label: 'Иконка',
      render: (s) =>
        (iconNames as Record<string, string>)[str(s['icon'])] ?? str(s['icon']),
    },
    { key: 'color', label: 'Цвет', render: (s) => str(s['color']) },
    archiveStatusField,
  ],
  RecurringTransaction: [
    typeField,
    amountField,
    exchangeRateField,
    categoryField,
    descriptionField,
    {
      key: 'dayOfMonth',
      label: 'День месяца',
      render: (s) => String(s['dayOfMonth']),
    },
    {
      key: 'endDate',
      label: 'Дата окончания',
      render: (s) =>
        s['endDate'] ? dateText(str(s['endDate'])) : 'Без ограничения',
    },
    {
      key: 'nextOccurrenceDate',
      label: 'Следующая операция',
      render: (s) => dateText(str(s['nextOccurrenceDate'])),
    },
    archiveStatusField,
  ],
};
export type AuditRow = { label: string; before?: string; after?: string };
// Снимки перед/после — только разрешённый набор доменных полей (ARCHITECTURE
// §16), уже без паролей/токенов; неизвестные/отсутствующие в конкретном
// историческом снимке поля молча пропускаются, а не приводят к падению экрана.
export function auditRows(
  entry: AuditEntryDto,
  baseCurrency: string,
): AuditRow[] {
  const defs = fieldsByEntityType[entry.entityType] ?? [];
  const before = entry.before;
  const after = entry.after;
  const rows: AuditRow[] = [];
  for (const def of defs) {
    const present = def.present ?? ((s: Snapshot) => def.key in s);
    const hasBefore = !!before && present(before);
    const hasAfter = !!after && present(after);
    if (!hasBefore && !hasAfter) continue;
    const beforeText = hasBefore ? def.render(before, baseCurrency) : undefined;
    const afterText = hasAfter ? def.render(after, baseCurrency) : undefined;
    if (entry.action === 'CREATE') {
      if (afterText !== undefined)
        rows.push({ label: def.label, after: afterText });
      continue;
    }
    if (entry.action === 'DELETE') {
      if (beforeText !== undefined)
        rows.push({ label: def.label, before: beforeText });
      continue;
    }
    if (beforeText !== afterText)
      rows.push({ label: def.label, before: beforeText, after: afterText });
  }
  return rows;
}
export const entityTypeLabel: Record<AuditEntryDto['entityType'], string> = {
  Transaction: 'Операция',
  Budget: 'Бюджет',
  Category: 'Категория',
  RecurringTransaction: 'Регулярное правило',
};
export const actionLabel: Record<AuditEntryDto['action'], string> = {
  CREATE: 'Создание',
  UPDATE: 'Изменение',
  DELETE: 'Удаление',
  ARCHIVE: 'Архивирование',
};
