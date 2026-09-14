import { useEffect, useState } from 'react';
import { Button } from '../../shared/ui/Button';
import { Input, Select } from '../../shared/ui/Field';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '../../shared/ui/Sheet';
import { useCategoryOptions } from './api';
import { usePreferenceOptions } from '../profile/preferences-query';
import { useExplorerParams } from './explorer-params';

export function TransactionFilters({ baseCurrency }: { baseCurrency: string }) {
  const { params, change, reset } = useExplorerParams();
  return (
    <div className="finance-filters">
      <Search
        value={params.search ?? ''}
        onChange={(value) => change({ search: value })}
      />
      <Select
        label={`Сортировка (суммы в ${baseCurrency})`}
        value={params.sort ?? 'newest'}
        onChange={(e) => change({ sort: e.target.value })}
      >
        <option value="newest">Новые сначала</option>
        <option value="oldest">Старые сначала</option>
        <option value="amountDesc">Сумма по убыванию</option>
        <option value="amountAsc">Сумма по возрастанию</option>
      </Select>
      <div className="finance-filters__desktop">
        <FilterFields baseCurrency={baseCurrency} />
      </div>
      <div className="finance-filters__mobile">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary">Фильтры</Button>
          </SheetTrigger>
          <SheetContent
            title="Фильтры операций"
            description={`Поиск по вашей истории. Диапазон сумм — в ${baseCurrency}.`}
          >
            <FilterFields baseCurrency={baseCurrency} />
            <SheetClose asChild>
              <Button>Показать операции</Button>
            </SheetClose>
          </SheetContent>
        </Sheet>
      </div>
      <Button variant="ghost" onClick={reset}>
        Сбросить фильтры
      </Button>
    </div>
  );
}
function Search({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [state, setState] = useState({ url: value, draft: value });
  if (state.url !== value) setState({ url: value, draft: value });
  const draft = state.draft;
  useEffect(() => {
    if (draft === value) return;
    const timeout = window.setTimeout(() => onChange(draft), 300);
    return () => window.clearTimeout(timeout);
  }, [draft, value, onChange]);
  return (
    <Input
      label="Поиск"
      placeholder="Описание или категория"
      maxLength={200}
      value={draft}
      onChange={(e) => setState({ url: value, draft: e.target.value })}
    />
  );
}
function FilterFields({ baseCurrency }: { baseCurrency: string }) {
  const { params, change } = useExplorerParams();
  const categories = useCategoryOptions();
  const preferences = usePreferenceOptions();
  return (
    <fieldset className="finance-filter-fields">
      <legend className="sr-only">Параметры фильтрации</legend>
      <Select
        label="Тип операции"
        value={params.type ?? 'ALL'}
        onChange={(e) => change({ type: e.target.value })}
      >
        <option value="ALL">Все типы</option>
        <option value="EXPENSE">Расход</option>
        <option value="INCOME">Доход</option>
      </Select>
      <Select
        label="Категория операции"
        value={params.categoryId ?? ''}
        onChange={(e) => change({ categoryId: e.target.value })}
      >
        <option value="">Все категории</option>
        {categories.data?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.archivedAt ? ' · В архиве' : ''}
          </option>
        ))}
      </Select>
      <Input
        label="Дата от"
        type="date"
        value={params.dateFrom ?? ''}
        onChange={(e) => change({ dateFrom: e.target.value })}
      />
      <Input
        label="Дата до"
        type="date"
        value={params.dateTo ?? ''}
        onChange={(e) => change({ dateTo: e.target.value })}
      />
      <Input
        label={`Сумма от (${baseCurrency})`}
        inputMode="decimal"
        value={params.amountMin ?? ''}
        onChange={(e) =>
          change({ amountMin: e.target.value.replace(',', '.') })
        }
      />
      <Input
        label={`Сумма до (${baseCurrency})`}
        inputMode="decimal"
        value={params.amountMax ?? ''}
        onChange={(e) =>
          change({ amountMax: e.target.value.replace(',', '.') })
        }
      />
      <Select
        label="Валюта операции"
        value={params.currency ?? ''}
        onChange={(e) => change({ currency: e.target.value })}
      >
        <option value="">Все валюты</option>
        {preferences.data?.currencies.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      {(categories.isError || preferences.isError) && (
        <div role="alert">
          Не удалось загрузить справочники.{' '}
          <Button
            onClick={() => {
              void categories.refetch();
              void preferences.refetch();
            }}
          >
            Повторить
          </Button>
        </div>
      )}
    </fieldset>
  );
}
