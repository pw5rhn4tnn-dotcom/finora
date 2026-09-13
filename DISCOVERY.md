Статус документа: **утвержденная каноническая спецификация / Source of Truth для Finora v1.0**.
Документ содержит решения, принятые на Discovery.
При реализации нельзя молча менять зафиксированные здесь продуктовые, UX- и доменные решения.
Исходные обязательные требования учебного задания остаются зафиксированы в `PROJECT.md` и не могут быть ослаблены этим документом.
Если существующая реализация, архитектурный документ или новое требование противоречит `PROJECT.md` либо этой спецификации, противоречие необходимо сначала явно обозначить и только затем принимать решение об изменении.

# Finora — итоговая спецификация проекта

## 1. Product Vision

**Finora** — современное веб-приложение для управления личными финансами, которое помогает пользователю не просто фиксировать доходы и расходы, а понимать свое финансовое состояние.

Продукт должен визуально и по UX восприниматься как настоящий premium-fintech сервис, а не как учебная CRUD-система.

Ключевая идея:

> Finora превращает историю операций, бюджеты и регулярные платежи в понятную картину личных финансов.

Основные характеристики продукта:

- простой учет доходов и расходов;
- месячное планирование;
- аналитика;
- мультивалютность;
- регулярные операции;
- качественный CSV-import;
- прозрачная история изменений;
- быстрый и современный пользовательский интерфейс.

---

# 2. Project Goals

Главные цели проекта:

1. Полностью выполнить обязательные требования учебного задания.
2. Создать portfolio-level full-stack приложение.
3. Показать production-grade подход без ненужного enterprise-overengineering.
4. Продемонстрировать:
   - проектирование API;
   - работу с PostgreSQL;
   - authentication/authorization;
   - аналитические запросы;
   - фоновые задачи;
   - импорт данных;
   - аудит изменений;
   - качественный responsive UX;
   - testing;
   - CI;
   - контейнеризацию.
5. Обеспечить гарантированный запуск в чистом окружении через:

```bash
docker compose up
```

6. Создать приложение, которое можно эффектно продемонстрировать за 5 минут.

---

# 3. Target Users

Основной пользователь:

**частное лицо, которое хочет контролировать личные доходы, расходы и месячные бюджеты.**

Дополнительный demo-персонаж:

**семейный финансовый профиль**, использующий более крупный и разнообразный набор операций.

При этом семейный профиль не является collaborative workspace.

Каждый аккаунт полностью независим.

---

# 4. User Roles

В версии 1.0 существует одна прикладная роль:

### User

Пользователь может работать исключительно со своими:

- транзакциями;
- категориями;
- бюджетами;
- регулярными операциями;
- настройками;
- audit records.

Admin-role отсутствует.

Любая изоляция данных обеспечивается backend, а не frontend.

---

# 5. Core User Journeys

### Journey 1 — Начало работы

Регистрация → выбор основной валюты → выбор timezone → автоматически созданные стандартные категории → пустой dashboard → создание первой транзакции.

### Journey 2 — Ежедневный учет

Dashboard → `Добавить операцию` → side sheet → ввод суммы, типа, категории, даты и описания → сохранение → моментальное обновление аналитики.

### Journey 3 — Анализ расходов

Dashboard → выбор месяца → просмотр KPI → распределение расходов → top categories → budgets → Financial Insights.

### Journey 4 — Работа с большим количеством операций

Транзакции → поиск → фильтры → сортировка → серверная пагинация → редактирование операции.

### Journey 5 — Импорт банковской истории

CSV → preview → mapping колонок → mapping категорий → validation → duplicate detection → import → итог.

### Journey 6 — Планирование бюджета

Бюджеты → создание лимита → просмотр использования → переключение месяца → при необходимости копирование бюджетов предыдущего месяца.

### Journey 7 — Регулярные операции

Создание правила → scheduler автоматически создает операции → пользователь при необходимости редактирует конкретную созданную транзакцию.

### Journey 8 — Проверка истории изменений

Журнал изменений → фильтрация → открытие записи → визуальный before/after diff.

---

# 6. Functional Requirements

## Authentication

- регистрация;
- вход;
- выход;
- получение текущего пользователя;
- JWT authentication;
- два seed demo-аккаунта;
- demo credentials на Login screen;
- выбор `baseCurrency` и `timeZone` при регистрации/onboarding;
- автоматическое создание стандартного набора категорий для нового пользователя.

## Transactions

Поля:

- сумма;
- дата;
- категория;
- описание;
- тип `INCOME | EXPENSE`;
- валюта;
- exchange rate;
- normalized amount;
- source.

CRUD:

- create;
- read;
- update;
- delete.

Transaction Explorer обязан поддерживать:

- поиск по `description` и названию категории;
- фильтр по диапазону дат;
- фильтр по типу `ALL | INCOME | EXPENSE`;
- фильтр по категории;
- фильтр по сумме `min / max`;
- фильтр по валюте;
- сортировку: новые сначала, старые сначала, сумма по убыванию, сумма по возрастанию;
- серверную пагинацию;
- размеры страницы `10 / 25 / 50`;
- отображение общего количества найденных операций.

## Categories

Поля:

- название;
- тип;
- цвет;
- иконка;
- archived state.

CRUD + архивирование.

## Budgets

Месячные бюджеты для expense-категорий.

Обязательные возможности:

- создать;
- изменить;
- удалить;
- просмотреть использование;
- переключить месяц.

Nice-to-have, не блокирующий v1:

- явное копирование бюджетов предыдущего месяца по действию пользователя.

## Dashboard

Dashboard поддерживает выбор месяца. При смене месяца соответствующая аналитика пересчитывается.

Обязательные и дополнительные показатели:

- доход за месяц;
- расход за месяц;
- net balance;
- savings rate;
- круговая/donut-диаграмма расходов по категориям;
- линейный график динамики доходов и расходов за 6 месяцев;
- top-5 expense categories;
- состояние бюджетов;
- Financial Insights;
- ближайшие recurring operations.

Six-month trend строится как выбранный месяц + предыдущие пять месяцев.

## Recurring Transactions

Поддерживается:

- `MONTHLY`;
- start date;
- optional end date;
- day of month;
- active/archive state;
- next occurrence;
- вычисление календарного дня в IANA timezone владельца;
- catch-up пропущенных occurrence после downtime;
- защита от duplicate occurrence на уровне БД.

## CSV Import

Wizard:

1. Upload.
2. Preview.
3. Column Mapping.
4. Category Mapping.
5. Validation.
6. Duplicate Detection.
7. Import.
8. Result.

До фактического импорта пользователь может вернуться к mapping и исправить его.

Неизвестные значения категорий **никогда не создают новые категории автоматически** — пользователь явно сопоставляет их с существующими категориями.

Разрешен partial import: валидные строки импортируются, невалидные пропускаются и отображаются в итоговом результате.

Potential duplicates показываются пользователю до импорта; по умолчанию они пропускаются, но пользователь может явно разрешить их импорт.

## CSV Export

Экспортируются **все транзакции, соответствующие активным фильтрам**, независимо от текущей страницы pagination.

## Audit Log

Логируются изменения:

- Transaction;
- Budget;
- Category;
- RecurringTransaction.

Действия включают как минимум `CREATE / UPDATE / DELETE / ARCHIVE`, где операция применима.

Audit log доступен только для чтения.

---

# 7. Business Rules

## Authentication and User Preferences

Email нормализуется и должен быть уникальным без учета регистра.

При регистрации пользователь выбирает:

- `baseCurrency`;
- IANA `timeZone`.

После регистрации backend автоматически создает стандартный набор категорий.

## Transaction

`amount > 0`.

Знак суммы не кодирует тип операции.

Тип определяется только:

```text
INCOME
EXPENSE
```

Категория должна иметь соответствующий тип.

Expense transaction не может использовать income category, а income transaction — expense category.

## Category

Используемая категория физически не удаляется.

Она архивируется.

Архивная категория:

- остается в истории;
- участвует в исторической аналитике;
- недоступна для новых транзакций;
- недоступна для новых бюджетов;
- недоступна для новых recurring rules.

Неиспользованная категория может быть удалена полностью.

## Budget

Бюджет разрешен только для expense category.

Ограничение:

```text
UNIQUE(userId, categoryId, year, month)
```

Два бюджета одного пользователя на одну и ту же категорию в одном месяце недопустимы.

## Currency

У пользователя есть одна `baseCurrency`.

После появления финансовых данных менять основную валюту нельзя.

Если:

```text
transaction.currency == user.baseCurrency
```

то:

```text
exchangeRate = 1
```

Если валюты отличаются:

```text
amountInBaseCurrency = amount × exchangeRate
```

Курс является snapshot и в будущем автоматически не изменяется.

При изменении суммы normalized amount пересчитывается с существующим rate.

При изменении валюты rate должен быть указан заново.

Для foreign-currency строки CSV, если достаточного курса нет в импортируемых данных, пользователь должен указать rate до фактического импорта; приложение не придумывает курс автоматически.

## Dashboard Analytics

`savingsRate` рассчитывается как:

```text
(income - expenses) / income × 100
```

при `income > 0`.

Если `income = 0`, приложение не выполняет деление на ноль и показывает корректное нейтральное/неопределенное состояние вместо фиктивного процента.

## CSV Import

Candidate duplicate определяется эвристически, а не уникальным database constraint. Базовый fingerprint использует:

- user;
- transaction date;
- amount;
- currency;
- type;
- normalized description.

Две реальные одинаковые операции в один день допустимы, поэтому duplicate detection является предупреждением, а не жестким запретом.

## Recurring Transactions

Scheduler определяет `today` в IANA timezone владельца правила, а не в timezone Docker-контейнера или сервера.

Редактирование recurring rule влияет только на будущие операции.

Исторические generated transactions не изменяются. После создания generated transaction становится обычной транзакцией: пользователь может редактировать ее независимо, и изменение конкретной транзакции не изменяет recurring template.

Если правило запускается 31 числа, для короткого месяца используется последний существующий день.

Scheduler обязан догонять missed occurrences после downtime.

Каждый occurrence создается не более одного раза.

Database constraint:

```text
UNIQUE(recurringTransactionId, recurringOccurrenceDate)
```

Если recurring rule еще ни разу не создавал транзакции, допускается hard delete.

Если recurring rule уже создавал транзакции, его нельзя hard-delete — только архивировать/деактивировать; исторические связи сохраняются.

## Audit

Изменение основной сущности и создание audit entry выполняются в одной DB transaction.

Audit entries неизменяемы со стороны пользовательского API.

Семантика snapshot:

- `CREATE`: `before = null`, `after = new state`;
- `UPDATE`: `before = old state`, `after = new state`;
- `DELETE`: `before = old state`, `after = null`;
- `ARCHIVE`: фиксируется как отдельное осмысленное изменение с before/after.

---

# 8. Non-functional Requirements

- responsive desktop/mobile;
- WCAG 2.2 AA как практический ориентир;
- strict TypeScript;
- deterministic database seed;
- structured logging;
- health checks;
- predictable errors;
- idempotent recurring jobs;
- database constraints;
- server-side pagination;
- производительность достаточная минимум для десятков тысяч транзакций пользователя;
- zero-setup Docker environment;
- отсутствие зависимости от внешних API для core functionality.

---

# 9. Information Architecture

Основные разделы:

```text
Обзор

Транзакции
  └ Импорт CSV

Бюджеты

Регулярные операции

Управление
  ├ Категории
  └ Журнал изменений

Настройки
  └ Профиль
```

---

# 10. Proposed Pages / Screens

### Public

```text
/login
/register
```

### Protected

```text
/
/transactions
/transactions/import
/budgets
/recurring
/categories
/audit-log
/settings
```

Отдельные страницы создания транзакций не требуются.

Create/Edit открываются через Side Sheet на desktop и через mobile-appropriate полноэкранный sheet/dialog на мобильных устройствах.

Отдельного route `/profile` в v1 нет: профиль является частью `/settings`.

---

# 11. UX Concept

Основные UX-принципы:

- минимум лишних переходов;
- важная финансовая информация видна сразу;
- progressive disclosure для сложных функций;
- destructive actions всегда объясняют последствия;
- состояния приложения никогда не остаются неоднозначными;
- advanced features не перегружают основной сценарий.

Главная UX-цель:

> пользователь должен понимать финансовое состояние максимум за несколько секунд после открытия Dashboard.

Responsive UX проектируется как отдельные режимы, а не как механически уменьшенный desktop:

- desktop использует левый sidebar;
- mobile primary navigation: `Обзор / Транзакции / Бюджеты / Ещё`;
- раздел `Ещё` открывает менее частые разделы, включая категории, регулярные операции, журнал изменений и настройки;
- desktop transaction table на mobile превращается в transaction cards;
- desktop filters на mobile открываются в отдельном filter sheet;
- CSV Import доступен из контекста раздела транзакций и navigation/action menu.

---

# 12. Visual Direction

Стиль:

**Premium fintech + умеренная analytics density.**

Необходимые характеристики:

- солидность;
- чистота;
- современность;
- ощущение настоящего коммерческого продукта;
- отсутствие визуального шума.

Не использовать чрезмерно:

- gradients;
- glassmorphism;
- neon effects;
- oversized shadows;
- декоративные animation effects.

Основная тема — светлая.

Dark mode — secondary nice-to-have / polish feature. Он не блокирует готовность Finora v1.0 и может быть отложен раньше любой обязательной функциональности.

---

# 13. Design System

Основа строится на design tokens.

### Цвета

Primary accent:

**глубокий Indigo.**

Semantic:

- green → positive/income/success;
- red → expense/destructive/error;
- amber → warning/approaching budget;
- neutrals → surfaces/text/borders.

Цвет не должен быть единственным способом передачи состояния.

### Typography

Современный sans-serif.

Финансовые значения имеют отдельную выразительную hierarchy.

### Spacing

Базовая кратность:

```text
4 / 8 px
```

### Radius

Умеренный, без чрезмерно rounded UI.

### Dark mode

Если dark mode реализуется в рамках доступного времени, используется полноценная token-based palette, а не CSS inversion.

---

# 14. Key UI Components

Reusable primitives:

- Button;
- Input;
- Select;
- Combobox;
- CurrencyInput;
- DatePicker;
- MonthPicker;
- CategoryPicker;
- Dialog;
- SideSheet;
- BottomSheet;
- Dropdown;
- Tooltip;
- Popover;
- DataTable;
- Pagination;
- FilterBar;
- FilterChip;
- KPI Card;
- Chart Card;
- Budget Progress;
- Transaction Row;
- Transaction Mobile Card;
- EmptyState;
- ErrorState;
- Skeleton;
- Toast;
- ConfirmDialog;
- AuditDiff;
- CSV Mapping Table.

---

# 15. Animations & Microinteractions

Используются функциональные microinteractions:

- drawer opening;
- dialogs;
- hover/focus;
- KPI transitions;
- chart appearance;
- budget progress;
- success feedback;
- skeleton transitions.

Типичная длительность:

```text
150–250 ms
```

Обязательная поддержка:

```css
prefers-reduced-motion
```

Декоративные тяжелые page transitions отсутствуют.

---

# 16. Empty / Loading / Error / Success States

Каждый major feature обязан иметь:

### Loading
Skeleton.

### Empty
Контекстное объяснение + CTA.

### Filtered Empty
Отдельное состояние:

> По выбранным фильтрам ничего не найдено.

### Error
Понятное сообщение + retry, если операция повторима.

### Success
Toast или contextual confirmation.

### Destructive
Confirmation dialog.

Функция не считается завершенной, если реализован только happy path.

---

# 17. Accessibility

Ориентир:

**WCAG 2.2 AA.**

Необходимы:

- keyboard navigation;
- visible focus;
- semantic HTML;
- form labels;
- корректные ARIA attributes;
- focus trapping в dialog;
- Escape behavior;
- touch targets;
- color contrast;
- textual chart summary;
- reduced motion support.

---

# 18. Frontend Architecture

Технологии:

- React;
- TypeScript;
- Vite;
- React Router;
- TanStack Query;
- React Hook Form;
- Zod;
- Tailwind CSS;
- shadcn/ui/Radix primitives;
- Recharts;
- Lucide;
- Motion для ограниченных microinteractions.

Подход:

```text
pages
features
entities/domain UI
shared UI
API client
hooks
utilities
```

Server state управляется TanStack Query.

Не создавать глобальный state store без реальной необходимости.

API contracts не копируются вручную между backend/frontend, если можно использовать OpenAPI-generated types/client.

---

# 19. Backend Architecture

Backend:

**NestJS modular monolith.**

Модули:

```text
AuthModule
UsersModule
TransactionsModule
CategoriesModule
BudgetsModule
RecurringTransactionsModule
DashboardModule
ImportsModule
AuditModule
HealthModule
```

Основной flow:

```text
Controller
   ↓
Application/Service
   ↓
Repository/Prisma
   ↓
PostgreSQL
```

Не создавать искусственные layers без необходимости.

Cross-cutting:

- authentication;
- authorization;
- validation;
- error handling;
- structured logging;
- request correlation;
- audit.

---

# 20. Database Model

Основные таблицы:

## users

```text
id
email
passwordHash
displayName
baseCurrency
timeZone
themePreference
createdAt
updatedAt
```

## categories

```text
id
userId
name
type
icon
color
archivedAt
createdAt
updatedAt
```

## transactions

```text
id
userId
categoryId

type
amount
currency
exchangeRate
amountInBaseCurrency

description
transactionDate

source

recurringTransactionId?
recurringOccurrenceDate?

createdAt
updatedAt
```

`source`:

```text
MANUAL
CSV
RECURRING
```

## budgets

```text
id
userId
categoryId
year
month
limitAmount
createdAt
updatedAt
```

Unique:

```text
(userId, categoryId, year, month)
```

## recurring_transactions

```text
id
userId
categoryId

type
amount
currency
exchangeRate

description
frequency

dayOfMonth
startDate
endDate?
nextOccurrenceDate

archivedAt

createdAt
updatedAt
```

## audit_entries

```text
id
userId
entityType
entityId
action
before
after
createdAt
```

`before/after` → PostgreSQL `JSONB`.

Денежные значения → `NUMERIC/DECIMAL`.

Никакой финансовой арифметики через binary floating-point.

---

# 21. API Design

Base URL:

```text
/api/v1
```

Основные ресурсы:

```text
/auth
/transactions
/categories
/budgets
/recurring-transactions
/dashboard
/imports
/audit-log
/settings
```

Swagger:

```text
/docs
```

API использует:

- nouns;
- HTTP semantics;
- predictable filtering;
- standard status codes;
- unified pagination;
- единый error contract.

---

# 22. Authentication & Authorization

Authentication:

JWT в:

```text
HttpOnly Cookie
```

Настройки:

```text
HttpOnly
SameSite=Strict
Secure в production
```

Password:

**Argon2id**.

Endpoints:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

Каждый protected request получает пользователя исключительно из authentication context.

API никогда не доверяет переданному клиентом `userId`.

---

# 23. Security

Минимальный security baseline:

- Argon2id;
- HttpOnly cookies;
- rate limit login/register;
- generic authentication errors;
- schema validation;
- ownership authorization;
- безопасная CORS policy;
- Origin validation для mutating browser requests;
- SQL через ORM/parameterization;
- file size limits;
- CSV parsing без выполнения содержимого;
- sensitive-data redaction в logs;
- password/JWT/cookie никогда не логируются;
- no stack traces пользователю;
- production secrets не хранятся в Git.

---

# 24. Validation

Validation выполняется минимум на трех уровнях:

### Frontend

Быстрый UX feedback.

### Backend

Авторитетная validation boundary.

### Database

Инварианты, которые можно выразить constraints.

Frontend validation никогда не считается security mechanism.

---

# 25. Error Handling

API использует единый Problem Details-подобный contract:

```json
{
  "type": "validation_error",
  "title": "Ошибка валидации",
  "status": 400,
  "detail": "Переданы некорректные данные",
  "errors": {},
  "traceId": "..."
}
```

Типовые категории:

```text
VALIDATION
AUTHENTICATION
AUTHORIZATION
NOT_FOUND
CONFLICT
RATE_LIMIT
INTERNAL
```

Unexpected exception:

- полностью логируется на backend;
- пользователь получает безопасное сообщение;
- silent failures запрещены.

---

# 26. Logging / Observability

Backend использует structured JSON logging.

Request log содержит:

- correlation/request ID;
- method;
- route;
- response status;
- execution duration.

Ошибки содержат stack trace только в server logs.

Endpoints:

```text
/health/live
/health/ready
```

Readiness проверяет PostgreSQL.

Не использовать без необходимости:

- Grafana;
- Prometheus;
- ELK;
- distributed tracing infrastructure.

---

# 27. Testing Strategy

Формальный минимум задания превышается.

Цель:

**25–40 meaningful automated tests + E2E smoke suite.**

### Backend

Основные проверки:

- authentication;
- authorization;
- user isolation;
- transaction validation;
- category type;
- category archival;
- budget uniqueness;
- currency calculations;
- audit atomicity;
- recurring idempotency;
- missed recurring occurrences;
- recurring end-of-month logic для 28/29/30/31;
- timezone-dependent recurring behavior;
- dashboard calculations;
- savings-rate edge case при отсутствии income;
- deterministic Financial Insights;
- CSV validation;
- category mapping;
- duplicate detection.

### Frontend

Vitest + Testing Library:

- important forms;
- validation display;
- filters;
- error/empty states;
- key UI behavior;
- critical keyboard/focus behavior.

### Integration

Backend integration tests работают с настоящей тестовой PostgreSQL.

### E2E

Playwright:

1. login → dashboard;
2. create transaction;
3. filter transactions;
4. CSV import;
5. user isolation/security smoke test.

При наличии времени дополнительно покрываются budget, recurring и audit flows.

---

# 28. Seed / Demo Data

Seed deterministic и идемпотентный.

Ориентировочно:

- 260–320 transactions;
- 14–16 categories;
- ровно как минимум 6 месяцев содержательной истории;
- income/expense;
- не менее 3 budgets и дополнительные budget scenarios для демонстрации состояний;
- recurring operations;
- 2–3 currencies;
- audit history;
- несколько Financial Insights scenarios.

Seed специально формируется так, чтобы были видны:

- top-5 categories;
- месяц с высоким savings rate;
- месяц с низким savings rate;
- бюджет около лимита;
- превышенный бюджет;
- meaningful month-over-month changes;
- recurring salary/subscriptions;
- readable audit diffs.

Два аккаунта:

### Personal Demo

Умеренный уровень доходов и расходов.

### Family Demo

Больше транзакций и более разнообразные бюджеты.

Аккаунты полностью независимы и не образуют shared household.

Login screen предоставляет быстрый demo access; demo credentials также документируются в README после их фактического появления.

---

# 29. Deployment Architecture

Docker Compose services:

```text
web
api
postgres
```

### web

Production frontend build + Nginx.

### api

NestJS.

Startup flow:

```text
wait for database
→ apply migrations
→ idempotent seed
→ start API
```

### postgres

Persistent Docker volume + healthcheck.

Ключевой acceptance test:

```bash
git clone <repo>
cd <repo>
docker compose up
```

После этого приложение должно работать без ручной настройки.

---

# 30. Performance Considerations

Применяются:

- server-side pagination;
- server-side filtering;
- database aggregation;
- indexes;
- search debounce;
- TanStack Query caching;
- ограничение размеров CSV;
- агрегированные dashboard endpoints.

Основные индексы ориентированы на:

```text
userId
transactionDate
categoryId
type
```

Не добавлять Redis cache без доказанной необходимости.

---

# 31. Suggested Tech Stack

## Repository

- Git;
- GitHub;
- monorepo;
- pnpm workspaces.

## Frontend

- React;
- TypeScript;
- Vite;
- React Router;
- TanStack Query;
- React Hook Form;
- Zod;
- Tailwind CSS;
- shadcn/ui;
- Radix UI;
- Recharts;
- Lucide;
- Motion;
- Vitest;
- Testing Library;
- Playwright.

## Backend

- Node.js;
- TypeScript;
- NestJS;
- Prisma ORM;
- PostgreSQL;
- Swagger/OpenAPI;
- Argon2id;
- Nest scheduling.

## Infrastructure

- Docker;
- Docker Compose;
- Nginx;
- GitHub Actions.

Конкретные package versions фиксируются на старте разработки и не обновляются без причины.

---

# 32. Nice-to-have Features

Не блокируют сдачу и могут быть отложены раньше любой обязательной функциональности:

- dark mode;
- копирование бюджетов предыдущего месяца;
- enhanced keyboard shortcuts;
- более богатые chart interactions;
- дополнительные Financial Insights;
- улучшенные audit filters.

---

# 33. Wow Features

Portfolio scope включает четыре showcase-направления.

## 1. Premium Dashboard

KPI + analytics + budgets + recurring + insights.

## 2. CSV Import Wizard

Полноценный mapping/validation workflow.

## 3. Financial Insights

Deterministic analytics:

- рост расходов;
- изменение savings rate;
- превышение бюджета;
- крупнейшая категория;
- заметные изменения месяц-к-месяцу.

Одновременно показываются только наиболее релевантные 2–4 insights.

## 4. Rich Audit Diff

Пользователь видит:

```text
Сумма
1 900 ₽ → 2 300 ₽

Категория
Транспорт → Путешествия
```

вместо raw JSON.

---

# 34. Features Intentionally Excluded

Сознательно НЕ реализуются:

- wallets/accounts/cards;
- transfers;
- совместный family workspace;
- roles/RBAC;
- admin panel;
- email verification;
- password reset;
- SMTP;
- social login;
- external FX provider;
- automatic exchange-rate updates;
- AI financial advisor;
- LLM;
- bank API integrations;
- import history subsystem;
- dashboard drag-and-drop customization;
- WebSockets;
- Redis;
- RabbitMQ;
- microservices;
- Kubernetes;
- CQRS framework;
- event sourcing.

Причина:

они значительно увеличивают scope и практически не повышают качество сдаваемой работы.

---

# 35. Risks and Trade-offs

## Docker startup

Самый высокий operational risk.

Mitigation:

- clean-machine testing;
- healthchecks;
- deterministic migrations;
- idempotent seed.

## Recurring transactions

Risk:

duplicate occurrences.

Mitigation:

database uniqueness + idempotent scheduler.

## CSV

Risk:

грязные входные данные.

Mitigation:

preview + validation + mapping + limits + partial import.

## Currency

Risk:

некорректная историческая конвертация.

Mitigation:

exchange-rate snapshot + блокировка base currency после появления financial data.

## Auth cookies

Risk:

CORS/cookie configuration.

Mitigation:

единая заранее определенная deployment topology и обязательные E2E auth tests.

## Scope

Risk:

polish может быть вытеснен количеством features.

Mitigation:

никаких новых крупных features после фиксации v1 scope без удаления другой задачи аналогичного размера.

---

# 36. Definition of Done

Feature считается завершенной только если:

1. Реализован happy path.
2. Реализована backend validation.
3. Реализована frontend validation.
4. Проверена authorization/data ownership.
5. Есть loading state.
6. Есть empty state, если применимо.
7. Есть error state.
8. Есть success feedback.
9. Обработаны важные edge cases.
10. UI responsive.
11. Keyboard/focus behavior корректен.
12. Нет silent failures.
13. Нет необоснованного `any`.
14. Нет необходимой функциональности, оставленной как TODO.
15. Нет mock/stub вместо требуемой реальной реализации.
16. Соответствующие автоматические тесты проходят.
17. Lint/typecheck проходят.
18. Docker build не сломан.
19. Swagger отражает актуальный API.
20. При необходимости обновлены ARCHITECTURE.md / README.md.
21. Существенная история разработки отражена в REPORT.md.
22. Изменение может быть оформлено отдельным логическим Git commit.

---

# 37. Acceptance Criteria

## Application

- Finora полностью работает на русском языке.
- UI locale — `ru-RU`; даты и денежные значения форматируются соответствующим образом.
- Интерфейс responsive.
- Desktop использует sidebar, mobile — bottom navigation `Обзор / Транзакции / Бюджеты / Ещё`.
- Transaction table на mobile имеет card representation.
- Mobile filters доступны через отдельный filter sheet.
- Light theme полностью завершена.
- Dark mode не является блокирующим acceptance criterion.
- Основные сценарии доступны с клавиатуры.

## Auth

- Пользователь может зарегистрироваться.
- Email нормализуется и уникален case-insensitive.
- При регистрации задаются `baseCurrency` и IANA `timeZone`.
- Новому пользователю автоматически создаются стандартные категории.
- Пользователь может войти.
- Пользователь может выйти.
- Один пользователь не может получить данные другого.
- Есть 2 demo accounts.

## Transactions

- CRUD работает.
- Клиентская и серверная validation присутствует.
- Поиск работает по description и названию категории.
- Работают фильтры: date range, type, category, amount min/max, currency.
- Работают сортировки: newest, oldest, amount descending, amount ascending.
- Pagination серверная с page sizes `10 / 25 / 50` и корректным total count.
- Currency conversion snapshot сохраняется.

## Categories

- CRUD работает.
- Type enforcement работает.
- Используемая категория архивируется.
- Архивная категория сохраняется в истории и historical analytics.
- Архивная категория не доступна для новых операций, бюджетов и recurring rules.

## Budgets

- Expense budgets работают.
- Duplicate monthly category budget невозможен.
- Progress рассчитывается правильно.
- Over-budget state отображается.

## Dashboard

Есть:

- income;
- expenses;
- net;
- savings rate;
- donut/pie chart расходов по категориям;
- line chart динамики доходов/расходов за 6 месяцев;
- top-5;
- budget overview;
- recurring block;
- Financial Insights.

Переключение месяца обновляет показатели. Six-month trend всегда показывает выбранный месяц и предыдущие пять месяцев.

`savingsRate = (income - expenses) / income × 100` при `income > 0`; при отсутствии дохода приложение корректно обрабатывает состояние без division by zero.

## CSV Import

Работает:

- upload;
- preview;
- column mapping;
- category mapping;
- возврат к mapping до фактического import;
- validation;
- duplicates warning;
- default skip potential duplicates с возможностью явного включения пользователем;
- partial import;
- result screen.

Unknown categories автоматически не создаются.

Ограничения:

```text
.csv
UTF-8
≤ 5 MB
≤ 10 000 rows
```

Если CSV содержит foreign currency без курса, пользователь должен предоставить rate для соответствующей валюты перед импортом.

## CSV Export

Экспортирует весь dataset, соответствующий текущим filters, а не только отображаемую страницу.

## Recurring Transactions

- monthly rule создается;
- scheduler использует IANA timezone владельца;
- scheduler генерирует transaction;
- restart не создает duplicate;
- missed occurrences восстанавливаются;
- last-day logic работает для 28/29/30/31;
- editing rule меняет только будущие occurrences и не меняет историю;
- generated transaction можно редактировать независимо от template;
- правило без generated transactions можно hard-delete;
- правило с историей только архивируется/деактивируется.

## Audit

- create/update/delete/archive логируются, где операция применима;
- before/after сохраняются;
- domain mutation и audit entry атомарны в одной DB transaction;
- пользователь не может изменять или удалять audit records;
- UI показывает readable diff.

## Tests

- минимум 10 тестов по заданию превышен;
- целевой suite содержит 25–40 meaningful tests;
- Playwright smoke tests проходят.

## CI

Pipeline проверяет:

```text
install
lint
format
typecheck
tests
build
Docker build
```

## Documentation

На русском языке:

```text
DISCOVERY.md
ARCHITECTURE.md
AI_RULES.md
ROADMAP.md
README.md
REPORT.md
Swagger/OpenAPI descriptions
```

ARCHITECTURE.md появляется в Git history до application implementation.

REPORT.md заполняется в ходе разработки и содержит:

- использованные AI tools;
- минимум один показательный prompt с кратким разбором результата;
- другие ключевые prompts при необходимости;
- успешные решения;
- неудачные решения;
- проблемы;
- исправления.

REPORT.md отражает реальный процесс разработки и не фабрикуется задним числом.

## Docker

Обязательный финальный тест:

```bash
git clone <repo>
cd <repo>
docker compose up
```

Без:

- ручной установки packages;
- ручного создания БД;
- ручного запуска migrations;
- ручного seed;
- обязательного редактирования configuration.

После запуска доступны:

```text
Finora UI
REST API
Swagger UI
PostgreSQL
```

---

# Language Policy

Все пользовательские и human-readable документационные материалы Finora создаются **на русском языке**:

- UI;
- validation messages;
- error messages;
- empty/success states;
- demo data;
- Swagger/OpenAPI descriptions;
- `DISCOVERY.md`;
- `ARCHITECTURE.md`;
- `AI_RULES.md`;
- `ROADMAP.md`;
- `README.md`;
- `REPORT.md`;
- прочие документы, предназначенные для чтения человеком.

Основной UI locale:

```text
ru-RU
```

Примеры форматирования:

```text
13.09.2026
12 450,00 ₽
```

Locale влияет только на представление и не определяет внутренний формат хранения дат, денег или API contracts.

Технические идентификаторы остаются на английском:

```text
Transaction
Budget
RecurringTransaction
amountInBaseCurrency
createdAt
```

Git commits рекомендуется оформлять в стиле:

```text
feat(transactions): добавить создание и фильтрацию операций
fix(recurring): исключить повторное создание операций
```

---

# Финальный Scope Statement

Finora v1.0 — это не демонстрационный CRUD и не попытка построить банковскую платформу.

Это завершенный portfolio-level personal finance product со следующей формулой:

**качественный fintech UX  
+ корректная финансовая модель  
+ надежный REST backend  
+ аналитика  
+ CSV workflow  
+ recurring automation  
+ auditability  
+ automated testing  
+ zero-setup Docker deployment.**