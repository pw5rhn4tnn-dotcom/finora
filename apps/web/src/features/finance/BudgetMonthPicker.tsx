import { Input, Select } from '../../shared/ui/Field';
import { monthNames } from './month-names';
export function BudgetMonthPicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const [year = '', month = ''] = value.split('-');
  return (
    <>
      <Select
        label="Месяц"
        value={month}
        onChange={(e) => onChange(`${year}-${e.target.value}`)}
      >
        <option value="">Выберите месяц</option>
        {monthNames.map((name, i) => (
          <option key={name} value={String(i + 1).padStart(2, '0')}>
            {name}
          </option>
        ))}
      </Select>
      <Input
        label="Год"
        inputMode="numeric"
        maxLength={4}
        value={year}
        error={error}
        onChange={(e) => onChange(`${e.target.value}-${month}`)}
      />
    </>
  );
}
