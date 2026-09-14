# Finora

Finora — приложение для управления личными финансами по [DISCOVERY.md](DISCOVERY.md).
Stage 1–5 сохранены. Stage 6 добавляет месячные бюджеты expense-категорий:
лимиты в основной валюте, фактические расходы, прогресс и атомарный audit.
Dashboard/Insights, CSV, scheduler и интерфейс журнала остаются следующими этапами.
Фактические результаты приёмки записаны в REPORT.

## Запуск с чистого checkout

Нужны Git, работающий Docker Desktop/Engine с Docker Compose и доступ к registries.
Локальные Node/pnpm, `.env` и ручные migrations/seed для этого запуска не нужны.
Из корня репозитория:

```bash
docker compose up
```

При первом запуске Compose сам собирает отсутствующие Web/API images. Дождитесь
готовности API и Web. Адреса по умолчанию:

- [Web](http://localhost:8080) — вход, регистрация и адаптивное личное пространство;
- [Swagger UI](http://localhost:8080/docs);
- [OpenAPI JSON](http://localhost:8080/docs/openapi.json);
- [Liveness](http://localhost:8080/health/live);
- [Readiness PostgreSQL](http://localhost:8080/health/ready).

API имеет prefix `/api/v1`; `/health/*` и `/docs` вынесены из него. Финансовые маршруты требуют cookie: без сессии `/api/v1/transactions` возвращает 401 Problem Details; неизвестный маршрут — 404.
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
На экране входа доступны обе demo-кнопки и эти публичные credentials.
Пароли хранятся как Argon2id hashes.

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

## Авторизация и настройки

Публичные `/login` и `/register`; остальные product routes требуют сессию.
Регистрация выбирает имя (1–100 символов), email (до 254), пароль (12–128),
валюту и часовой пояс. Email trim/lowercase; дубликат возвращает 409.
В одной транзакции создаются пользователь, 8 стандартных категорий и 8 записей
аудита. `/settings` меняет имя, основную валюту и часовой пояс; email отображается
без редактирования. Основная валюта доступна до первой операции, бюджета или
recurring rule; даже удалённые финансовые данные в audit сохраняют блокировку.

| Метод     | URL                        | Назначение                                                        |
| --------- | -------------------------- | ----------------------------------------------------------------- |
| POST      | `/api/v1/auth/register`    | Регистрация и cookie, 201                                         |
| POST      | `/api/v1/auth/login`       | Вход и cookie, 200                                                |
| POST      | `/api/v1/auth/logout`      | Очистка cookie, 204, в том числе для истёкшей сессии              |
| GET       | `/api/v1/auth/me`          | Текущий пользователь, 200 или 401                                 |
| GET       | `/api/v1/settings/options` | Публичный каталог валют и IANA timezone из ICU закреплённого Node |
| GET/PATCH | `/api/v1/settings`         | Только собственный профиль                                        |

Сессия — HS256 JWT (`sub`, `iat`, `exp`, issuer `finora`, audience `finora-web`),
TTL **24 часа**. Cookie `finora_session`: HttpOnly, SameSite=Strict, Path=/,
без Domain; Secure включён по умолчанию в API, для локального HTTP Compose
явно выключен. JWT никогда не доступен React/localStorage. Logout очищает
cookie текущего браузера; ранее скопированный JWT действителен до `exp`.
Refresh tokens, server-side revoke и завершение всех устройств не реализуются.

`AUTH_SECRET` обязателен (от 32 байт); значение в Compose/.env.example — только
публичный локальный demo secret. Для HTTPS production задайте собственный секрет,
`AUTH_COOKIE_SECURE=true` и точный HTTPS origin в `AUTH_ORIGINS`.
`AUTH_ORIGINS` — список через запятую, без путей, завершающих `/` и wildcard.
Compose defaults учитывают WEB_PORT и localhost/127.0.0.1; dev Vite использует
`http://127.0.0.1:5173` из `.env.example`. Origin обязателен на всех изменяющих
запросах, включая login/register/logout; API-клиенты и тесты передают его явно.
Same-origin Swagger работает через Nginx. CORS разрешает credentials только
точному allowlist; access token в заголовке Authorization не используется.

Login: **10 запросов за 60 секунд на IP**. Register: **5 запросов за час на IP**.
Учитываются успешные и неуспешные запросы; 429 возвращает Problem Details и
`Retry-After` в секундах. Лимиты действуют также на варианты регистра пути и
завершающий `/`. Локальный limiter хранит до 10 000 активных IP/endpoint buckets,
при заполнении отклоняет новые; restart API обнуляет лимиты. Redis не требуется
для одного процесса. `AUTH_TRUST_PROXY=true` допустим только в закрытой топологии
Compose: API не публикуется наружу, Nginx заменяет X-Forwarded-For адресом клиента.
При прямой локальной разработке trust proxy выключен.

JSON request body ограничен 16 KiB. Неизвестные поля (включая userId, связи и
служебные значения) отклоняются. Ошибки полей русские, внутренние SQL/Prisma,
пароли и cookie наружу и в HTTP logs не попадают. Ответы API имеют `no-store`.
При смене владельца/logout отменяются запросы, удаляются пользовательские
queries/mutations, текущее значение сессии заменяется через `/auth/me`-контекст.

`pnpm test:e2e:auth` запускает всю прежнюю Docker acceptance, затем Chromium
проверяет auth/settings и Stage 5 CRUD через production Nginx и настоящую PostgreSQL. Этому
расширенному режиму нужны host pnpm/dependencies и Chromium. Обычный
`pnpm test:docker` по-прежнему требует только Node/Git/Docker на хосте.
Оба режима используют свои чистые копии, контейнеры и volumes с cleanup.

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
pnpm test:e2e:auth
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
build, Playwright/axe UI smoke, проверку OpenAPI generation и auth E2E через Compose/Nginx. Второй выполняет clean/repeated Docker acceptance,
включая build обоих images. Тестовые данные воспроизводимы, developer machine не нужна.

**По данным пользователя, Stage 5 (`352d4cb`) прошёл GitHub Actions.**
Результаты локального CI-equivalent Stage 6 записаны в REPORT. Commit/push
текущей рабочей версии не выполнялись; remote CI для неё не запускался.

## UI foundation

Tokens, composition, breakpoints и доступность описаны в [apps/web/README.md](apps/web/README.md).
При `pnpm dev:web` ссылка «Компоненты интерфейса» открывает dev-only витрину
`/design-system`; в production витрина не доступна. Формы в витрине не отправляют
данные. Категории и операции показывают реальные данные текущего пользователя из API.

## Документация

[PROJECT.md](PROJECT.md) — исходное задание; [DISCOVERY.md](DISCOVERY.md) — каноническая
спецификация; [AI_RULES.md](AI_RULES.md) — правила разработки;
[ARCHITECTURE.md](ARCHITECTURE.md) — архитектура;
[ROADMAP.md](ROADMAP.md) — этапы; [REPORT.md](REPORT.md) — реальные проверки и проблемы.

## Категории и операции (Stage 5)

`/categories` — свои категории с названием, типом, иконкой и цветом; список всех,
активных или архивных. Создание и редактирование открываются в Sheet. Название
trim, 1–100 символов; повтор имени без учёта регистра в одном типе возвращает 409,
включая архив. Смена типа используемой категории запрещена. Удаление требует
подтверждения: неиспользованная категория удаляется, используемая архивируется;
связанные активные регулярные правила архивируются атомарно. Scheduler не запускается.

`/transactions` — собственная история, desktop table и mobile cards. Сумма всегда
положительна; доход/расход задаётся типом. Описание обязательно (trim, 1–500 символов).
Дата — календарная `YYYY-MM-DD`, без timezone-сдвига; первоначальное значение формы
берётся в часовом поясе пользователя. Категория должна принадлежать владельцу и
соответствовать типу. Новые связи с архивом запрещены; прежнюю архивную категорию
исторической операции можно сохранить при редактировании.

Деньги API передаёт строками, UI принимает точку или запятую. Валюты и их точность
проверяются локальным ICU закреплённого Node. Курс foreign currency пользователь
задаёт к основной валюте. Для baseCurrency курс 1. При изменении суммы сохраняется
курс, при изменении валюты нужен новый. Сервер рассчитывает сумму Decimal-арифметикой
и округляет HALF_UP один раз до точности основной валюты. Максимум исходной/базовой
суммы меньше 10^16, precision хранения 8; курс меньше 10^12, precision 12.
Очень маленький положительный пересчёт может округлиться к нулю.
Первая финансовая запись блокирует смену baseCurrency, включая после удаления.

| Методы               | Ресурс                       | Назначение                                                          |
| -------------------- | ---------------------------- | ------------------------------------------------------------------- |
| GET / POST           | `/api/v1/categories`         | Список / создание                                                   |
| GET                  | `/api/v1/categories/options` | Компактный собственный справочник выбора, включая архив для истории |
| GET / PATCH / DELETE | `/api/v1/categories/{id}`    | Чтение / частичное изменение / удаление либо архивирование          |
| GET / POST           | `/api/v1/transactions`       | Список / создание операции                                          |
| GET / PATCH / DELETE | `/api/v1/transactions/{id}`  | Чтение / частичное изменение / удаление                             |

Lists: `{items,page,pageSize,total}`, страницы от 1, размеры `10/25/50` (по умолчанию
25). Категории: `state=all|active|archived`. Операции: `search`, `type=ALL|INCOME|EXPENSE`,
`categoryId`, `dateFrom/dateTo` включительно, `amountMin/amountMax`, `currency`,
`sort=newest|oldest|amountDesc|amountAsc`. Поиск буквальный без регистра по описанию
и названию категории, с trim. Суммовые фильтры/сортировки работают в **основной валюте**.
Порядок дополнен ID, `total` учитывает только собственные отфильтрованные записи.
Фильтры/страницы сохранены в URL, поиск задерживается на 300 мс, смена фильтра сбрасывает
страницу. Пустая страница за концом списка даёт переход к первой странице.

Все изменяющие запросы требуют прежний разрешённый Origin. Неизвестные поля
(включая userId, ownerId, timestamps, normalized amount и source) отклоняются.
Чужой и отсутствующий ID дают одинаковый 404, недоступная category relation — одинаковый 400. Изменение и audit before/after фиксируются в одной DB transaction. UI не повторяет
mutations автоматически; ошибка сохраняет форму. Открытый диалог принадлежит странице
и переживает обновление списка. Cookie/session и ownership проверки Stage 4 сохранены.

Stage 5 завершён локально после self-review: backend 42/42, frontend 47/47,
shell 15/15, Compose browser 18/18. Полные результаты и ограничения — в
[REPORT.md](REPORT.md). Текущий Stage 6 описан ниже; его commit/push не выполнялись.

## Месячные бюджеты (Stage 6)

`/budgets` показывает лимиты и расходы за выбранный месяц. Выбор месяца и года
русскоязычный; текущий месяц определяется в IANA timezone профиля. Период и
пагинация сохраняются в URL (`period=2026-09&page=1&pageSize=25`). Формы создания,
изменения и подтверждения удаления используют существующий Sheet. Ошибка сервера
сохраняет введённые данные, отправка блокирует повторное нажатие и закрытие панели.

| Метод     | URL                                 | Результат                                      |
| --------- | ----------------------------------- | ---------------------------------------------- |
| GET       | `/api/v1/budgets?year=2026&month=9` | Своя страница `items/page/pageSize/total`, 200 |
| POST      | `/api/v1/budgets`                   | Создание, 201                                  |
| GET/PATCH | `/api/v1/budgets/:id`               | Своя запись / изменение, 200                   |
| DELETE    | `/api/v1/budgets/:id`               | Удаление, 204; операции и audit сохраняются    |

Вход: `categoryId`, целые `year` (1–9999), `month` (1–12), положительная decimal
строка `limitAmount` с точностью основной валюты (до 16 целых знаков). GET требует
год и месяц явно; query без ведущих нулей, `pageSize=10|25|50`. PATCH принимает
хотя бы одно разрешённое поле. Запрещены client owner/currency/derived fields.
Дубликат категории в месяце — 409, недоступный ID — 404, неверный ввод — 400.

Новые бюджеты используют только собственные активные expense-категории. Историческая
архивная категория остаётся видимой и участвует в расчётах; можно изменить лимит
прежнего периода. При выборе другого периода или категории нужна активная категория.
Бюджеты блокируют смену baseCurrency, в том числе после удаления через audit.

`spent` — серверная сумма `amountInBaseCurrency` расходов категории по календарной
`transactionDate` в полуоткрытом диапазоне месяца. Даты DATE не сдвигаются при смене
timezone. `remaining = limitAmount - spent`, `overBudget = spent > limitAmount`;
`progress` — decimal string процента с 2 знаками HALF_UP. Число процентов может
превышать 100; полоса ограничена 100, текст и ARIA сообщают реальное превышение.
Все денежные вычисления выполняются Decimal/PostgreSQL, не зависят от страницы
или фильтров списка операций. Изменение/удаление операции обновляет использование.

`pnpm test:e2e:auth` проверяет Stage 4/5 и отдельный Stage 6 browser suite через
production Nginx/PostgreSQL; между suites перезапускает тестовый API для независимого
auth limiter. Порог production rate limit не меняется. `pnpm test:docker` включает
бюджеты, реальный spent, ownership, повторный seed и сохранность после restart.
Seed уже содержит 16 месячных бюджетов и состояния около/сверх лимита, без изменения
пользовательских данных при повторном запуске. Rollover, копирование, scheduler и
аналитика dashboard в Stage 6 не входят.
