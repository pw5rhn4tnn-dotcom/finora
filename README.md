# Finora

Finora — приложение для управления личными финансами по [DISCOVERY.md](DISCOVERY.md).
Stage 1 foundation сохранён; Stage 2 добавляет PostgreSQL/Prisma, миграции, богатый
seed и Docker runtime. **Stage 3 — Design System & App Shell локально завершён**: светлая тема,
reusable primitives, responsive sidebar/bottom navigation и явно обозначенные
предварительные экраны. API содержит только инфраструктурные endpoints.
Авторизации, финансового CRUD и dashboard ещё нет. Проверки записаны в REPORT.

## Запуск с чистого checkout

Нужны Git, работающий Docker Desktop/Engine с Docker Compose и доступ к registries.
Локальные Node/pnpm, `.env` и ручные migrations/seed для этого запуска не нужны.
Из корня репозитория:

```bash
docker compose up
```

При первом запуске Compose сам собирает отсутствующие Web/API images. Дождитесь
готовности API и Web. Адреса по умолчанию:

- [Web](http://localhost:8080) — адаптивная оболочка Stage 3;
- [Swagger UI](http://localhost:8080/docs);
- [OpenAPI JSON](http://localhost:8080/docs/openapi.json);
- [Liveness](http://localhost:8080/health/live);
- [Readiness PostgreSQL](http://localhost:8080/health/ready).

API имеет prefix `/api/v1`; `/health/*` и `/docs` вынесены из него. Предметных
маршрутов пока нет: `/api/v1/transactions` возвращает реальный 404 Problem Details.
Nginx раздаёт production frontend и проксирует API/Swagger/health через один origin.

Startup: PostgreSQL healthcheck → проверка реального SQL-подключения →
`prisma migrate deploy` → runtime permissions → атомарный seed → Nest/Prisma →
API healthcheck → Web. Ошибка migration/seed останавливает API с ненулевым кодом.
Случайного sleep нет; отдельный preflight делает до 30 ограниченных SQL-попыток.

Остановка — Ctrl+C, затем при необходимости:

```bash
docker compose down
```

Volume сохраняется. Следующий `docker compose up` проверяет migrations и пропускает
уже загруженный seed, сохраняя пользовательские изменения. После изменения исходников
пересоберите images через `docker compose up --build`; для первого запуска `--build`
не обязателен. **Полный сброс demo-БД с удалением её данных:**

```bash
docker compose down -v
docker compose up
```

Порты Web 8080 и PostgreSQL 5432 должны быть свободны. Их можно изменить через
`WEB_PORT` и `POSTGRES_PORT` в необязательном `.env` из [.env.example](.env.example).
API наружу отдельно не опубликован. PostgreSQL опубликована только на loopback
для локальной разработки. Все пароли в примере — публичные локальные demo defaults.
Это учебный HTTP stack, не конфигурация публичного production hosting.

## Demo dataset

Два независимых профиля; общей семейной учётной записи или сущностей accounts нет.
Пароли реально записаны как Argon2id hashes, но вход появится только на Stage 4.

| Профиль                  | Email                   | Публичный demo-пароль | Операции |
| ------------------------ | ----------------------- | --------------------- | -------- |
| Алексей · личные финансы | personal@finora.example | Finora-Personal-2026! | 120      |
| Мария · семейный бюджет  | family@finora.example   | Finora-Family-2026!   | 168      |

Всего: **288 transactions, 16 categories, 16 budgets, 6 recurring rules,
364 audit entries**, 2 пользователя, валюты RUB/USD/EUR. Шесть месяцев с доходами,
расходами, near/over budgets, высоким/низким savings rate и месячной динамикой.
Сохранены snapshot-курсы, recurring salary/rent/subscriptions и читаемые audit diffs.
Нет работающего scheduler, CSV import или analytics API.

Первая загрузка выбирает текущий UTC-месяц как последний месяц истории. Опора
сохраняется в seed-записи и не меняется при restart. Для точной воспроизводимости
укажите `SEED_ANCHOR_DATE=2026-09-01`: история охватывает апрель–сентябрь 2026.
Изменение переменной после загрузки не перемещает существующие данные.

Seed выполняется один раз атомарно под PostgreSQL advisory lock. Последующие запуски
не создают дублей, не перетирают edits и не восстанавливают удалённые операции.
Подробная карта schema → discovery, денежные диапазоны и стратегия seed находятся в
[apps/api/prisma/README.md](apps/api/prisma/README.md).

## Разработка вне Docker

Нужны Node.js **24.21.0** (`.nvmrc`), pnpm **12.4.1** (`packageManager`) и PostgreSQL.
При nvm выполните `nvm install` и `nvm use`; pnpm должен быть в PATH. Foundation
версии сохранены; все прямые Stage 2 зависимости exact, lockfile зафиксирован.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
set -a
. ./.env
set +a
docker compose up -d --wait postgres
pnpm db:setup
```

`set -a`/source предназначены для sh/bash/zsh. Compose читает `.env` самостоятельно;
pnpm-команды получают его через окружение shell. Не перезаписывайте существующий
`.env` командой `cp`: она показана для чистого checkout.

Установка автоматически выполняет Prisma generate. `db:setup` применяет migration,
выдаёт runtime-права и запускает seed. Runtime и migration URLs различны. Локальные
привилегированные credentials нужны только setup/tests, не frontend.

В двух терминалах (с загруженным окружением для API):

```bash
pnpm dev:api
```

```bash
pnpm dev:web
```

API: `127.0.0.1:3000`; Vite: [127.0.0.1:5173](http://127.0.0.1:5173), с proxy
`/api/v1`, `/docs`, `/health`. Порт Vite фиксирован. После build API можно запустить
через `pnpm --filter @finora/api start`. Остановка — Ctrl+C; после работы остановите
свой Compose stack через `docker compose down`.

## Проверки

После подготовки PostgreSQL и загрузки переменных окружения:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm --filter @finora/web exec playwright install chromium
pnpm test:e2e
pnpm build
pnpm db:validate
pnpm api:check
pnpm test:docker
```

| Команда             | Назначение                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm db:generate`  | Сгенерировать Prisma client из schema                                                    |
| `pnpm db:validate`  | Проверить Prisma schema                                                                  |
| `pnpm db:migrate`   | Применить сохранённые migrations через migrate deploy                                    |
| `pnpm db:seed`      | Собрать и выполнить идемпотентный seed                                                   |
| `pnpm db:setup`     | Migrate → runtime permissions → seed для local dev                                       |
| `pnpm api:generate` | Экспортировать реальный Swagger-контракт и пересоздать Orval client                      |
| `pnpm api:check`    | Проверить отсутствие изменений после повторной генерации                                 |
| `pnpm test:e2e`     | Playwright: responsive shell, keyboard/focus, reflow, reduced motion и axe accessibility |
| `pnpm test:docker`  | Clean-source Compose builds, migrations/seed, HTTP, outage/recovery, restart и cleanup   |
| `pnpm format`       | Отформатировать изменяемые исходники/документы                                           |

`pnpm test` сохраняет Stage 1 frontend/Nest smoke и запускает real PostgreSQL
integration. Тесты сами создают отдельные `finora_test_*` databases, применяют baseline
и удаляют их после проверки. `MIGRATION_DATABASE_URL` должен указывать на локальную
или CI PostgreSQL с правом CREATE DATABASE/ROLE. Demo database не очищается тестами.
Без PostgreSQL suite завершается ошибкой; silent skip или SQLite substitute нет.

`test:docker` требует Git, Node и Docker для самого runner, но **не устанавливает
host dependencies для приложений**: делает временную копию Git-visible исходников,
поднимает отдельный Compose project на свободных портах без `--build` и `.env`,
проверяет все сервисы, повторный seed и сохранность полного dataset. В finally
останавливает свои containers и удаляет свой volume. Основной developer volume
не затрагивается. Первый прогон требует загрузки images и npm packages.

Prisma-generated client/builds/node_modules игнорируются Git. Реальный OpenAPI JSON
и Orval-generated source хранятся в Git и проверяются воспроизводимой генерацией.
PROJECT/DISCOVERY/AI_RULES исключены из автоматического форматирования.

## CI

GitHub Actions имеет два jobs. Первый использует PostgreSQL service и выполняет
frozen install, schema validation, lint, format, strict typecheck, smoke/integration,
build, Playwright/axe UI smoke и проверку OpenAPI generation. Второй выполняет clean/repeated Docker acceptance,
включая build обоих images. Тестовые данные воспроизводимы, developer machine не нужна.

**Remote GitHub Actions: pending verification after commit/push.**

## UI foundation

Tokens, composition, breakpoints и доступность описаны в [apps/web/README.md](apps/web/README.md).
При `pnpm dev:web` ссылка «Компоненты интерфейса» открывает dev-only витрину
`/design-system`; в production витрина не доступна. Формы в витрине не отправляют
данные. Stage 3 не подключает financial seed к UI.

## Документация

[PROJECT.md](PROJECT.md) — исходное задание; [DISCOVERY.md](DISCOVERY.md) — каноническая
спецификация; [AI_RULES.md](AI_RULES.md) — правила разработки;
[ARCHITECTURE.md](ARCHITECTURE.md) — архитектура;
[ROADMAP.md](ROADMAP.md) — этапы; [REPORT.md](REPORT.md) — реальные проверки и проблемы.
