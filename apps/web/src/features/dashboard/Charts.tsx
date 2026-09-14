import type { DashboardDto } from '@finora/api-client';
import { moneyText } from '../finance/format';
import { CategoryMark } from '../finance/CategoryMark';
import { monthLabel } from './month-label';
function segmentOffsets(data: DashboardDto) {
  const result: number[] = [];
  let offset = 0;
  for (const category of data.distribution) {
    result.push(offset);
    offset += Number(category.share);
  }
  return result;
}

export function ExpenseChart({ data }: { data: DashboardDto }) {
  // Number только на границе отрисовки геометрии; значения/доли рассчитаны API.
  const offsets = segmentOffsets(data);
  return (
    <>
      {data.distribution.some((c) => Number(c.amount) > 0) ? (
        <svg
          className="dashboard-donut"
          viewBox="0 0 200 200"
          aria-hidden="true"
          focusable="false"
        >
          <circle
            cx="100"
            cy="100"
            r="72"
            fill="none"
            stroke="var(--color-surface-secondary)"
            strokeWidth="28"
          />
          {data.distribution.map((c, i) => {
            const length = Number(c.share);
            const segment = (
              <circle
                key={c.category.id}
                cx="100"
                cy="100"
                r="72"
                pathLength="100"
                fill="none"
                stroke={c.category.color}
                strokeWidth="28"
                strokeDasharray={`${length} ${100 - length}`}
                strokeDashoffset={-offsets[i]!}
                transform="rotate(-90 100 100)"
              />
            );
            return segment;
          })}
        </svg>
      ) : (
        <p className="dashboard-empty">В этом месяце расходов нет.</p>
      )}
      <ul className="dashboard-list" aria-label="Расходы по категориям">
        {data.distribution.map((c) => (
          <li key={c.category.id}>
            <CategoryMark category={c.category} />
            <span className="numeric">
              {moneyText(c.amount, data.currency)}{' '}
              <small>{c.share.replace('.', ',')}%</small>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
export function TrendChart({ data }: { data: DashboardDto }) {
  const ceiling = Math.max(
    1,
    ...data.trend.flatMap((m) => [Number(m.income), Number(m.expense)]),
  );
  const points = (field: 'income' | 'expense') =>
    data.trend
      .map(
        (m, i) => `${20 + i * 100},${160 - (Number(m[field]) / ceiling) * 140}`,
      )
      .join(' ');
  return (
    <>
      <div className="dashboard-legend">
        <span>Доходы — сплошная линия</span>
        <span>Расходы — пунктир</span>
      </div>
      <svg
        className="dashboard-trend"
        viewBox="0 0 540 200"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M20 20V160H520" fill="none" stroke="var(--color-border)" />
        <polyline
          points={points('income')}
          fill="none"
          stroke="var(--color-income)"
          strokeWidth="3"
        />
        <polyline
          points={points('expense')}
          fill="none"
          stroke="var(--color-expense)"
          strokeWidth="3"
          strokeDasharray="8 5"
        />
        {data.trend.map((m, i) => (
          <text
            key={`${m.year}-${m.month}`}
            x={20 + i * 100}
            y="190"
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            fontSize="12"
          >
            {String(m.month).padStart(2, '0')}.
            {String(m.year).slice(-2).padStart(2, '0')}
          </text>
        ))}
      </svg>
      <details className="dashboard-table">
        <summary>Точные значения за шесть месяцев</summary>
        <table>
          <caption className="sr-only">
            Доходы и расходы по месяцам в {data.currency}
          </caption>
          <thead>
            <tr>
              <th scope="col">Месяц</th>
              <th scope="col">Доходы</th>
              <th scope="col">Расходы</th>
            </tr>
          </thead>
          <tbody>
            {data.trend.map((m) => (
              <tr key={`${m.year}-${m.month}`}>
                <th scope="row">{monthLabel(m.year, m.month)}</th>
                <td className="numeric">
                  {moneyText(m.income, data.currency)}
                </td>
                <td className="numeric">
                  {moneyText(m.expense, data.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
