import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  PiggyBank,
  Plus,
} from 'lucide-react';
import type { DashboardDto } from '@finora/api-client';
import { useAuth } from '../auth/auth-context';
import { useDashboard } from './api';
import { ExpenseChart, TrendChart } from './Charts';
import { monthLabel } from './month-label';
import { moneyText, todayInZone } from '../finance/format';
import { BudgetMonthPicker } from '../finance/BudgetMonthPicker';
import { BudgetProgress } from '../finance/BudgetProgress';
import { CategoryMark } from '../finance/CategoryMark';
import { ActiveFinanceSheet } from '../finance/ActiveFinanceSheet';
import type { ActiveAction } from '../finance/active-action';
import { Button, ButtonLink } from '../../shared/ui/Button';
import {
  PageContainer,
  PageHeader,
  Section,
  Card,
} from '../../shared/ui/Surface';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/States';
import { safeError } from '../../shared/api/client';

function Metrics({ data }: { data: DashboardDto }) {
  const metrics = [
    {
      label: 'Доходы',
      value: moneyText(data.income, data.currency),
      icon: ArrowDownLeft,
      tone: 'income',
    },
    {
      label: 'Расходы',
      value: moneyText(data.expense, data.currency),
      icon: ArrowUpRight,
      tone: 'expense',
    },
    {
      label: 'Разница доходов и расходов',
      value: moneyText(data.net, data.currency),
      icon: Wallet,
      tone: 'net',
    },
    {
      label: 'Доля сбережений',
      value:
        data.savingsRate === null
          ? 'Не определена'
          : `${data.savingsRate.replace('.', ',')}%`,
      icon: PiggyBank,
      tone: 'savings',
    },
  ];
  return (
    <div className="dashboard-metrics">
      {metrics.map(({ label, value, icon: Icon, tone }) => (
        <Card
          className={`dashboard-metric dashboard-metric--${tone}`}
          key={label}
        >
          <div className="dashboard-metric__label">
            <h2>{label}</h2>
            <Icon aria-hidden="true" />
          </div>
          <p className="numeric">{value}</p>
          {tone === 'savings' && (
            <small>
              {data.savingsRate === null
                ? 'Для расчёта нужен доход за месяц.'
                : 'Доля дохода, оставшаяся после расходов.'}
            </small>
          )}
        </Card>
      ))}
    </div>
  );
}
export function Dashboard() {
  const user = useAuth().data!;
  const [url, setUrl] = useSearchParams();
  const state: unknown = useLocation().state;
  const loginNotice =
    state &&
    typeof state === 'object' &&
    'notice' in state &&
    typeof state.notice === 'string'
      ? state.notice
      : '';
  const [notice, setNotice] = useState(loginNotice);
  const [action, setAction] = useState<ActiveAction | null>(null);
  const current = todayInZone(user.timeZone).slice(0, 7);
  const period = url.get('period') ?? current;
  const valid =
    /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(period) && period >= '0001-06';
  const [year, month] = (valid ? period : current).split('-').map(Number);
  const query = useDashboard({ year: year!, month: month! }, valid);
  const change = (value: string) => setUrl({ period: value });
  const add = (
    <Button
      onClick={(e) =>
        setAction({
          kind: 'transaction',
          mode: 'create',
          trigger: e.currentTarget,
        })
      }
    >
      <Plus aria-hidden="true" />
      Добавить операцию
    </Button>
  );
  const data = valid && query.isSuccess ? query.data : null;
  return (
    <PageContainer>
      <PageHeader
        title="Обзор"
        description="Ваши финансы. В ясной перспективе."
        action={add}
      />
      {notice && (
        <p role="status" className="finance-notice">
          {notice}
        </p>
      )}
      <Card className="finance-card budget-period">
        <BudgetMonthPicker
          value={period}
          onChange={change}
          error={
            valid ? undefined : 'Укажите месяц в диапазоне 0001-06 — 9999-12'
          }
        />
        <Button variant="secondary" onClick={() => change(current)}>
          Текущий месяц
        </Button>
      </Card>
      {valid && (
        <p className="dashboard-period-label">
          {monthLabel(year!, month!)} · основная валюта {user.baseCurrency}
        </p>
      )}
      {valid && query.isPending && <LoadingState label="Загружаем обзор…" />}
      {valid && query.isError && (
        <ErrorState
          description={safeError(query.error)}
          action={
            <Button
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              Повторить
            </Button>
          }
        />
      )}
      {data && (
        <div
          className="dashboard-content"
          aria-label={`Финансы: ${monthLabel(data.year, data.month)}`}
        >
          <p role="status" className="sr-only">
            {query.isFetching
              ? 'Обновляем обзор…'
              : `Обзор за ${monthLabel(data.year, data.month)} загружен.`}
          </p>
          <Metrics data={data} />
          {!data.hasTransactions && (
            <EmptyState
              title="За этот месяц операций пока нет"
              description="Добавьте доход или расход. История предыдущих месяцев и заданные бюджеты доступны ниже."
            />
          )}
          <div className="dashboard-charts">
            <Card className="dashboard-panel">
              <Section
                title="Расходы по категориям"
                description={`Всего ${moneyText(data.expense, data.currency)} за выбранный месяц.`}
              >
                <ExpenseChart data={data} />
              </Section>
            </Card>
            <Card className="dashboard-panel">
              <Section
                title="Доходы и расходы"
                description="Выбранный месяц и пять предыдущих. Пустые месяцы показаны нулями."
              >
                <TrendChart data={data} />
              </Section>
            </Card>
          </div>
          <Section
            title="Наблюдения"
            description="Сравнение полных календарных месяцев. Текущий месяц может быть ещё не завершён."
          >
            {data.insights.length ? (
              <ul className="dashboard-insights">
                {data.insights.map((item) => (
                  <li key={item.code}>
                    <Card className="dashboard-panel">
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dashboard-empty">
                Пока недостаточно оснований для наблюдений.
              </p>
            )}
          </Section>
          <div className="dashboard-charts">
            <Card className="dashboard-panel">
              <Section
                title="Топ-5 категорий расходов"
                description="От большей суммы к меньшей."
              >
                {data.topCategories.length ? (
                  <ol className="dashboard-list dashboard-top">
                    {data.topCategories.map((c) => (
                      <li key={c.category.id}>
                        <CategoryMark category={c.category} />
                        <strong className="numeric">
                          {moneyText(c.amount, data.currency)}
                        </strong>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="dashboard-empty">
                    Категории появятся после первого расхода.
                  </p>
                )}
              </Section>
            </Card>
            <Card className="dashboard-panel">
              <Section title="Ближайшие регулярные операции">
                <p className="dashboard-empty">
                  Регулярные операции пока недоступны. Здесь пока нет
                  расписания.
                </p>
              </Section>
            </Card>
          </div>
          <Section
            title="Бюджеты месяца"
            description="Лимиты и фактические расходы по категориям."
          >
            <div className="dashboard-budget-link">
              <ButtonLink variant="secondary">
                <Link to={`/budgets?period=${period}`}>
                  Управлять бюджетами
                </Link>
              </ButtonLink>
            </div>
            {data.budgets.length ? (
              <div className="budget-grid">
                {data.budgets.map((budget) => (
                  <Card className="budget-card" key={budget.id}>
                    <h3>
                      <CategoryMark category={budget.category} />
                    </h3>
                    <BudgetProgress budget={budget} />
                  </Card>
                ))}
              </div>
            ) : (
              <p className="dashboard-empty">
                На этот месяц бюджетов нет. Задайте лимит в разделе «Бюджеты».
              </p>
            )}
          </Section>
        </div>
      )}
      <ActiveFinanceSheet
        action={action}
        onClose={() => setAction(null)}
        onSuccess={setNotice}
      />
    </PageContainer>
  );
}
