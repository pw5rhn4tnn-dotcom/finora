import { useId } from 'react';
import type { BudgetDto } from '@finora/api-client';
import { moneyText } from './format';
export function BudgetProgress({ budget }: { budget: BudgetDto }) {
  const id = useId();
  // Number используется только для ширины полосы; все финансовые значения — серверные строки.
  const percent = Math.min(100, Number(budget.progress));
  const state = budget.overBudget
    ? `Превышение на ${moneyText(budget.remaining.slice(1), budget.currency)}`
    : /^0(?:\.0+)?$/.test(budget.remaining)
      ? 'Лимит исчерпан'
      : `Осталось ${moneyText(budget.remaining, budget.currency)}`;
  return (
    <div
      className={`budget-progress ${budget.overBudget ? 'budget-progress--over' : ''}`}
    >
      <p>
        Потрачено <strong>{moneyText(budget.spent, budget.currency)}</strong>
      </p>
      <p>Лимит {moneyText(budget.limitAmount, budget.currency)}</p>
      <div
        className="budget-progress__track"
        role="progressbar"
        aria-label={`Использование бюджета «${budget.category.name}»`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${budget.progress.replace('.', ',')}%. ${state}`}
        aria-describedby={id}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <p id={id} className="budget-progress__state">
        {state}
      </p>
      <p>{budget.progress.replace('.', ',')}% использовано</p>
    </div>
  );
}
