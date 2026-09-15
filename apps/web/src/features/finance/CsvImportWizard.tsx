import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { ImportAnalysisDto, ImportResultDto } from '@finora/api-client';
import { Button, ButtonLink } from '../../shared/ui/Button';
import { Input, Select } from '../../shared/ui/Field';
import { Card } from '../../shared/ui/Surface';
import { LoadingState } from '../../shared/ui/States';
import { safeError } from '../../shared/api/client';
import { useCategoryOptions } from './api';
import {
  useImportCommit,
  useImportPreview,
  useImportValidate,
  type ImportOptionsInput,
} from './csv-import-api';

type Step = 'upload' | 'columns' | 'categories' | 'review' | 'result';

const MAPPING_TARGETS = [
  { key: 'transactionDate', label: 'Дата операции', required: true },
  { key: 'type', label: 'Тип (INCOME/EXPENSE)', required: true },
  { key: 'amount', label: 'Сумма', required: true },
  { key: 'currency', label: 'Валюта', required: true },
  { key: 'exchangeRate', label: 'Курс к основной валюте', required: false },
  { key: 'category', label: 'Категория', required: true },
  { key: 'description', label: 'Описание', required: true },
] as const;
const RATE_PATTERN = /^(0|[1-9][0-9]{0,11})(\.[0-9]{1,12})?$/;

// Заголовок текущего шага получает фокус при переходе — тот же приём, что и
// смена route (ARCHITECTURE §6), только внутри одной страницы-мастера.
function useStepFocus(step: Step) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [step]);
  return ref;
}

export function CsvImportWizard() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<string[][]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [rates, setRates] = useState<Record<string, string>>({});
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [analysis, setAnalysis] = useState<ImportAnalysisDto | null>(null);
  const [result, setResult] = useState<ImportResultDto | null>(null);

  const preview = useImportPreview();
  const validate = useImportValidate();
  const commit = useImportCommit((r) => {
    setResult(r);
    setStep('result');
  });

  function reset() {
    setFile(null);
    setColumns([]);
    setSampleRows([]);
    setTotalRows(0);
    setMapping({});
    setCategoryMap({});
    setRates({});
    setIncludeDuplicates(false);
    setAnalysis(null);
    setResult(null);
    preview.reset();
    validate.reset();
    commit.reset();
    setStep('upload');
  }

  function buildOptions(overrides?: {
    categoryMap?: Record<string, string>;
    rates?: Record<string, string>;
    includeDuplicates?: boolean;
  }): ImportOptionsInput {
    return {
      file: file!,
      mapping,
      categoryMap: overrides?.categoryMap ?? categoryMap,
      rates: overrides?.rates ?? rates,
      includeDuplicates: overrides?.includeDuplicates ?? includeDuplicates,
    };
  }

  return (
    <Card>
      {step === 'upload' && (
        <UploadStep
          pending={preview.isPending}
          error={preview.error}
          onSelect={(selected) => {
            setFile(selected);
            preview.mutate(selected, {
              onSuccess: (data) => {
                setColumns(data.columns);
                setSampleRows(data.sampleRows);
                setTotalRows(data.totalRows);
                setMapping(guessMapping(data.columns));
                setStep('columns');
              },
            });
          }}
        />
      )}
      {step === 'columns' && (
        <ColumnMappingStep
          columns={columns}
          sampleRows={sampleRows}
          totalRows={totalRows}
          mapping={mapping}
          onChange={setMapping}
          pending={validate.isPending}
          error={validate.error}
          onBack={() => setStep('upload')}
          onContinue={() => {
            validate.mutate(buildOptions({ categoryMap: {}, rates: {} }), {
              onSuccess: (data) => {
                setAnalysis(data);
                setStep(
                  data.unmappedCategories.length > 0 ||
                    data.missingRateCurrencies.length > 0
                    ? 'categories'
                    : 'review',
                );
              },
            });
          }}
        />
      )}
      {step === 'categories' && analysis && (
        <CategoryMappingStep
          unmappedCategories={analysis.unmappedCategories}
          missingRateCurrencies={analysis.missingRateCurrencies}
          categoryMap={categoryMap}
          rates={rates}
          onCategoryMapChange={setCategoryMap}
          onRatesChange={setRates}
          pending={validate.isPending}
          error={validate.error}
          onBack={() => setStep('columns')}
          onContinue={() => {
            validate.mutate(buildOptions(), {
              onSuccess: (data) => {
                setAnalysis(data);
                setStep('review');
              },
            });
          }}
        />
      )}
      {step === 'review' && analysis && (
        <ReviewStep
          analysis={analysis}
          includeDuplicates={includeDuplicates}
          onToggleDuplicates={(value) => {
            setIncludeDuplicates(value);
            validate.mutate(buildOptions({ includeDuplicates: value }), {
              onSuccess: setAnalysis,
            });
          }}
          pendingValidate={validate.isPending}
          pendingCommit={commit.isPending}
          error={commit.error}
          onBack={() => setStep('categories')}
          onConfirm={() => commit.mutate(buildOptions())}
        />
      )}
      {step === 'result' && result && (
        <ResultStep result={result} onRestart={reset} />
      )}
    </Card>
  );
}

function guessMapping(columns: string[]): Record<string, string> {
  const byLower = new Map(columns.map((c) => [c.trim().toLowerCase(), c]));
  const mapping: Record<string, string> = {};
  for (const target of MAPPING_TARGETS) {
    const found = byLower.get(target.key.toLowerCase());
    if (found) mapping[target.key] = found;
  }
  return mapping;
}

function UploadStep({
  pending,
  error,
  onSelect,
}: {
  pending: boolean;
  error: unknown;
  onSelect: (file: File) => void;
}) {
  const heading = useStepFocus('upload');
  return (
    <section className="csv-import-step">
      <h2 ref={heading} tabIndex={-1}>
        Шаг 1 из 4. Загрузите CSV-файл
      </h2>
      <p>
        Файл в кодировке UTF-8, разделитель — запятая, не более 5 МБ и 10 000
        строк данных. Заголовок с названиями столбцов обязателен.
      </p>
      <Input
        label="CSV-файл"
        type="file"
        accept=".csv,text/csv"
        disabled={pending}
        onChange={(event) => {
          const selected = event.currentTarget.files?.[0];
          if (selected) onSelect(selected);
        }}
      />
      {pending && <LoadingState label="Разбираем файл…" />}
      {!!error && (
        <p role="alert" className="field__error">
          {safeError(error)}
        </p>
      )}
    </section>
  );
}

function ColumnMappingStep({
  columns,
  sampleRows,
  totalRows,
  mapping,
  onChange,
  pending,
  error,
  onBack,
  onContinue,
}: {
  columns: string[];
  sampleRows: string[][];
  totalRows: number;
  mapping: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
  pending: boolean;
  error: unknown;
  onBack: () => void;
  onContinue: () => void;
}) {
  const heading = useStepFocus('columns');
  const [touched, setTouched] = useState(false);
  const missing = MAPPING_TARGETS.filter((t) => t.required && !mapping[t.key]);
  return (
    <section className="csv-import-step">
      <h2 ref={heading} tabIndex={-1}>
        Шаг 2 из 4. Сопоставьте столбцы
      </h2>
      <p role="status">
        Строк данных в файле: {totalRows}. Укажите, какой столбец файла
        соответствует каждому полю операции.
      </p>
      <fieldset className="finance-form" disabled={pending}>
        <legend className="sr-only">Соответствие столбцов</legend>
        {MAPPING_TARGETS.map((target) => (
          <Select
            key={target.key}
            label={target.label + (target.required ? '' : ' (необязательно)')}
            value={mapping[target.key] ?? ''}
            error={
              touched && target.required && !mapping[target.key]
                ? 'Выберите столбец'
                : undefined
            }
            onChange={(event) => {
              const value = event.currentTarget.value;
              const next = { ...mapping };
              if (value) next[target.key] = value;
              else delete next[target.key];
              onChange(next);
            }}
          >
            <option value="">
              {target.required ? 'Выберите столбец' : 'Не использовать'}
            </option>
            {columns.map((column) => (
              <option value={column} key={column}>
                {column}
              </option>
            ))}
          </Select>
        ))}
      </fieldset>
      {sampleRows.length > 0 && (
        <div
          className="csv-import-preview"
          role="region"
          aria-label="Пример строк файла"
        >
          <table>
            <caption className="sr-only">
              Первые строки загруженного файла
            </caption>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleRows.slice(0, 5).map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!!error && (
        <p role="alert" className="field__error">
          {safeError(error)}
        </p>
      )}
      <div className="finance-actions">
        <Button variant="secondary" onClick={onBack} disabled={pending}>
          Назад
        </Button>
        <Button
          onClick={() => {
            setTouched(true);
            if (missing.length === 0) onContinue();
          }}
          disabled={pending}
        >
          {pending ? 'Проверяем…' : 'Продолжить'}
        </Button>
      </div>
    </section>
  );
}

function CategoryMappingStep({
  unmappedCategories,
  missingRateCurrencies,
  categoryMap,
  rates,
  onCategoryMapChange,
  onRatesChange,
  pending,
  error,
  onBack,
  onContinue,
}: {
  unmappedCategories: string[];
  missingRateCurrencies: string[];
  categoryMap: Record<string, string>;
  rates: Record<string, string>;
  onCategoryMapChange: (value: Record<string, string>) => void;
  onRatesChange: (value: Record<string, string>) => void;
  pending: boolean;
  error: unknown;
  onBack: () => void;
  onContinue: () => void;
}) {
  const heading = useStepFocus('categories');
  const categories = useCategoryOptions();
  const [touched, setTouched] = useState(false);
  const active = categories.data?.filter((c) => !c.archivedAt) ?? [];
  const missingCategory = unmappedCategories.filter((raw) => !categoryMap[raw]);
  const invalidRate = missingRateCurrencies.filter(
    (currency) => !RATE_PATTERN.test((rates[currency] ?? '').trim()),
  );
  return (
    <section className="csv-import-step">
      <h2 ref={heading} tabIndex={-1}>
        Шаг 3 из 4. Категории и курсы валют
      </h2>
      {categories.isPending && <LoadingState label="Загружаем категории…" />}
      {unmappedCategories.length > 0 && (
        <fieldset className="finance-form" disabled={pending}>
          <legend>Сопоставьте значения категории из файла</legend>
          {unmappedCategories.map((raw) => (
            <Select
              key={raw}
              label={raw}
              value={categoryMap[raw] ?? ''}
              error={
                touched && !categoryMap[raw] ? 'Выберите категорию' : undefined
              }
              onChange={(event) => {
                const value = event.currentTarget.value;
                const next = { ...categoryMap };
                if (value) next[raw] = value;
                else delete next[raw];
                onCategoryMapChange(next);
              }}
            >
              <option value="">Выберите категорию</option>
              {active.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name} · {c.type === 'EXPENSE' ? 'Расход' : 'Доход'}
                </option>
              ))}
            </Select>
          ))}
        </fieldset>
      )}
      {missingRateCurrencies.length > 0 && (
        <fieldset className="finance-form" disabled={pending}>
          <legend>Укажите курс к основной валюте</legend>
          {missingRateCurrencies.map((currency) => (
            <Input
              key={currency}
              label={`Курс ${currency}`}
              inputMode="decimal"
              autoComplete="off"
              value={rates[currency] ?? ''}
              error={
                touched && !RATE_PATTERN.test((rates[currency] ?? '').trim())
                  ? 'Укажите положительный курс'
                  : undefined
              }
              onChange={(event) =>
                onRatesChange({
                  ...rates,
                  [currency]: event.currentTarget.value,
                })
              }
            />
          ))}
        </fieldset>
      )}
      {!!error && (
        <p role="alert" className="field__error">
          {safeError(error)}
        </p>
      )}
      <div className="finance-actions">
        <Button variant="secondary" onClick={onBack} disabled={pending}>
          Назад
        </Button>
        <Button
          onClick={() => {
            setTouched(true);
            if (missingCategory.length === 0 && invalidRate.length === 0)
              onContinue();
          }}
          disabled={pending}
        >
          {pending ? 'Проверяем…' : 'Продолжить'}
        </Button>
      </div>
    </section>
  );
}

function ReviewStep({
  analysis,
  includeDuplicates,
  onToggleDuplicates,
  pendingValidate,
  pendingCommit,
  error,
  onBack,
  onConfirm,
}: {
  analysis: ImportAnalysisDto;
  includeDuplicates: boolean;
  onToggleDuplicates: (value: boolean) => void;
  pendingValidate: boolean;
  pendingCommit: boolean;
  error: unknown;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const heading = useStepFocus('review');
  const invalidRows = analysis.rows.filter((r) => r.status === 'invalid');
  const shown = invalidRows.slice(0, 50);
  return (
    <section className="csv-import-step">
      <h2 ref={heading} tabIndex={-1}>
        Шаг 4 из 4. Проверьте результат перед импортом
      </h2>
      <ul className="csv-import-summary">
        <li>Всего строк: {analysis.totalRows}</li>
        <li>Будет импортировано: {analysis.importableRows}</li>
        <li>Вероятные дубли: {analysis.duplicateRows}</li>
        <li>Пропущено по ошибкам: {analysis.invalidRows}</li>
      </ul>
      {analysis.duplicateRows > 0 && (
        <label className="csv-import-checkbox">
          <input
            type="checkbox"
            checked={includeDuplicates}
            disabled={pendingValidate}
            onChange={(event) =>
              onToggleDuplicates(event.currentTarget.checked)
            }
          />
          Включить вероятные дубли в импорт
        </label>
      )}
      {invalidRows.length > 0 && (
        <div role="region" aria-label="Строки с ошибками">
          <table>
            <caption className="sr-only">
              Строки, пропущенные по ошибкам
            </caption>
            <thead>
              <tr>
                <th scope="col">Строка</th>
                <th scope="col">Причина</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.row}>
                  <td>{row.row}</td>
                  <td>{row.errors.map((e) => e.message).join('; ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {invalidRows.length > shown.length && (
            <p>
              Показаны первые {shown.length} из {invalidRows.length} строк с
              ошибками.
            </p>
          )}
        </div>
      )}
      {!!error && (
        <p role="alert" className="field__error">
          {safeError(error)}
        </p>
      )}
      <div className="finance-actions">
        <Button
          variant="secondary"
          onClick={onBack}
          disabled={pendingValidate || pendingCommit}
        >
          Назад
        </Button>
        <Button
          onClick={onConfirm}
          disabled={
            pendingValidate || pendingCommit || analysis.importableRows === 0
          }
        >
          {pendingCommit
            ? 'Импортируем…'
            : `Импортировать ${analysis.importableRows} операций`}
        </Button>
      </div>
    </section>
  );
}

function ResultStep({
  result,
  onRestart,
}: {
  result: ImportResultDto;
  onRestart: () => void;
}) {
  const heading = useStepFocus('result');
  return (
    <section className="csv-import-step">
      <h2 ref={heading} tabIndex={-1}>
        Импорт завершён
      </h2>
      <p role="status">
        Импортировано операций: {result.imported}. Пропущено дублей:{' '}
        {result.duplicateRows}. Пропущено по ошибкам: {result.invalidRows}.
      </p>
      <div className="finance-actions">
        <Button variant="secondary" onClick={onRestart}>
          Импортировать другой файл
        </Button>
        <ButtonLink>
          <Link to="/transactions">Перейти к операциям</Link>
        </ButtonLink>
      </div>
    </section>
  );
}
