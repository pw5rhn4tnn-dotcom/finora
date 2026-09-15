# Finora

Finora — приложение для управления личными финансами по [DISCOVERY.md](DISCOVERY.md).
Stages 1–9 опубликованы: операции, бюджеты, dashboard/Insights, регулярные
операции и импорт/экспорт CSV. Stage 10 добавляет read-only журнал изменений
(`/audit-log`) с читаемым до/после diff поверх аудита, который пишется с
Stage 4.
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
Scheduler, dashboard/analytics API, CSV import/export и журнал изменений
(`/audit-log`) уже работают; отдельного экрана истории импорта пока нет.

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
Browser runner также поднимает отдельный Compose для intentional rate-limit test:
его API process/БД не разделяют состояние с обычным auth/finance suite, production
лимиты сохранены. При ручном запуске auth compose spec требуются оба origin:
`FINORA_COMPOSE_URL` основного окружения и `FINORA_SECURITY_COMPOSE_URL` отдельного
чистого security окружения. Повторный запуск security test требует нового окружения,
поскольку он намеренно исчерпывает register bucket. Setup sessions и test data
не зависят от выполнения других test cases; подробности — в frontend README.

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

**Stages 0–8 закоммичены и присутствуют в git-истории (`848c384`, CI-исправление
`93566e0`).** Независимый remote GitHub Actions run с подтверждённым результатом
зафиксирован в REPORT.md только для Stage 7 (`1c683e1`, GREEN); для HEAD `93566e0`
такой записи в REPORT.md нет, и в этой сессии подтверждения его результата не
поступало. Stage 9 (CSV Import/Export) реализован и проверен локально поверх этого
HEAD — см. REPORT. Commit/push рабочей версии Stage 9 не выполнялись в этой сессии;
remote CI для неё не запускался, поэтому статус — LOCAL VALIDATION COMPLETE, не
FINAL COMPLETE.

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
связанные активные регулярные правила архивируются атомарно (scheduler больше не
создаёт по ним новые операции, см. Stage 8).

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

## Обзор и наблюдения (Stage 7)

После входа открывается Dashboard: доходы, расходы, разница и доля сбережений,
расходы по категориям, тренд за шесть месяцев, Top-5, бюджеты и до четырёх
обоснованных наблюдений. Текущий месяц определяется timezone профиля. Выбранный
месяц хранится в URL `/?period=2026-09`; «Текущий месяц» возвращает к текущему.
Для отсутствующих расходов/бюджетов/истории есть отдельные пустые состояния,
ошибка загрузки предлагает повторить запрос. При income = 0 доля сбережений
не определена; отрицательная разница не является балансом банковского счёта.

`GET /api/v1/dashboard?year=2026&month=9` отдаёт все блоки из одного согласованного
снимка PostgreSQL. Принимает только year/month без ведущих нулей. Диапазон выбранного
месяца 0001-06…9999-12 нужен для полного шестимесячного окна. Все суммы — decimal
strings в основной валюте. Архивные категории сохраняются в аналитике. Полный
контракт виден в Swagger; клиент воспроизводится через `pnpm api:generate`.

Пороги наблюдений: превышение бюджета или использование от 90%, рост/снижение
расходов от 20%, изменение доли сбережений от 10 п.п., крупнейшая категория от 30%.
Приоритеты и условия достаточности описаны в [ARCHITECTURE.md](ARCHITECTURE.md), §31.
Сравниваются полные календарные месяцы, включая пока незавершённый текущий.
При отсутствии базы проценты не выдумываются. Блок «Ближайшие регулярные операции»
показывает до пяти активных правил по возрастанию даты, независимо от выбранного
месяца; реальные данные подключены в Stage 8.

Для проверки: войдите в personal demo, выберите месяц seed, раскройте точные
значения под графиком, откройте создание операции, сохраните расход и проверьте
изменение KPI, категории и бюджета. В family demo аналитика другого владельца.
Seed уже содержит шесть месяцев и нужные бюджетные сценарии, поэтому не менялся.

```bash
pnpm test:e2e:auth
# Отдельный Dashboard suite на уже поднятом disposable Compose:
FINORA_COMPOSE_URL=http://127.0.0.1:8080 pnpm --filter @finora/web exec playwright test dashboard.compose.spec.ts --workers=2 --retries=0
# 20 последовательных запусков, 120 critical cases, workers 1/2/4, без retries:
FINORA_COMPOSE_URL=http://127.0.0.1:8080 FINORA_STRESS_COMPOSE_PROJECT=finora-test FINORA_STRESS_COMPOSE_DIR="$PWD" pnpm test:e2e:stage7-stress
```

Browser suite создаёт собственные записи и удаляет их в finally; использует
неизменяемые сессии setup и новые contexts для каждого теста. Stress перезапускает API указанного disposable Compose перед каждым запуском,
чтобы реальные повторные входы не делили limiter; production policy не меняется.
Также повторяет logout/login, двух владельцев, navigation, resize и управляемую обратную доставку настоящих ответов и create → cancel → refetch.
Смена владельца с поздним ответом, error/retry, семь viewport, 200% текста и axe
проверяются полным suite. Artifacts создаются через `testInfo.outputPath()`;
секретные storageState не входят в Git и удаляются runner после прогона.
Для параллельных Playwright процессов задайте разные `FINORA_PLAYWRIGHT_OUTPUT_DIR`.
Не запускайте тесты на пользовательских production-данных: нужен отдельный Compose.

## Регулярные операции (Stage 8)

`/recurring-transactions` — собственные MONTHLY правила: сумма/валюта/курс/категория/
описание, `startDate` (её календарный день становится `dayOfMonth`) и необязательный
`endDate` включительно. `PATCH` меняет шаблон и — для `dayOfMonth`/`endDate` — расписание;
`startDate` неизменяем. Перед сохранением изменённого расписания сервис обязательно
догоняет весь накопленный долг по прежним параметрам, и только затем применяет новые
(иначе уже пропущенные месяцы получили бы неверный день). Пока правило ни разу не
создало операцию, `DELETE` удаляет его физически; после первой генерации — архивирует,
сохраняя историю и запрещая новые occurrence. Архивное правило нельзя редактировать.

Scheduler работает внутри `api`, без очереди и отдельного worker: тик каждые 60 секунд
(`RECURRING_SCHEDULER_INTERVAL_MS`, можно отключить через `RECURRING_SCHEDULER_DISABLED=true`)
плюс один немедленный проход при старте процесса — поэтому restart сразу подтягивает
накопленный долг, не дожидаясь следующего интервала. Каждая occurrence обрабатывается
собственной короткой DB transaction: блокировка владельца и правила (`SELECT ... FOR
UPDATE`, тот же порядок, что и у остальных мутаций) → повторная проверка активности и
даты в IANA `timeZone` владельца → создание `Transaction(source=RECURRING)` и audit
`CREATE` → продвижение `nextOccurrenceDate` и audit `UPDATE`/`ARCHIVE` при достижении
`endDate`. Уникальность пары `(recurringTransactionId, recurringOccurrenceDate)` —
финальная защита БД от дублей при параллельных процессах; блокировка исключает саму
гонку. Долг одного правила ограничен 60 occurrence за проход — остаток продолжает
следующий тик, без потерь. Месяц всегда считается от исходного `dayOfMonth`, а не от
уже укороченной даты: 31 января → 28/29 февраля → снова 31 марта. Удалённая пользователем
generated transaction не появляется заново — проверка учитывает её audit `CREATE`.

Для проверки: `pnpm --filter @finora/api test` покрывает calendar/timezone unit-тесты
(28/29/30/31, leap year, DST-нейтральность DATE, IANA `timeZone` вместо timezone
контейнера), CRUD/ownership/validation, catch-up после «downtime», исчерпание по
`endDate`, self-heal при рассинхронизации с архивом категории, смену `dayOfMonth` с
обязательным catch-up и, отдельно, конкурентность: два независимых `PrismaClient` и
четыре независимых OS-процесса запускают tick на одно и то же due правило — БД
гарантирует ровно один `Transaction`. `pnpm test:docker` перезапускает `api` дважды на
одну и ту же дату: первый restart создаёт occurrence, второй не создаёт дубль.

## Импорт и экспорт CSV (Stage 9)

`/transactions/import` — мастер из четырёх шагов: загрузка файла → сопоставление
столбцов → сопоставление категорий/курсов (только если в файле есть значения,
которые сервер ещё не может сопоставить) → проверка результата с подтверждением.
Файл: UTF-8, разделитель — запятая, заголовок обязателен, до 5 МБ и 10 000 строк
данных. Столбцы файла могут называться как угодно — пользователь сопоставляет
шесть обязательных целей (`transactionDate/type/amount/currency/category
/description`) и необязательный `exchangeRate` вручную; сервер повторно проверяет
файл при каждом шаге, включая финальное подтверждение.

| Метод | URL                           | Назначение                                                            |
| ----- | ----------------------------- | --------------------------------------------------------------------- |
| POST  | `/api/v1/imports/preview`     | Разобрать файл: заголовки, пример строк, число строк, 200             |
| POST  | `/api/v1/imports/validate`    | Построчная validation и duplicate analysis без записи в БД, 200       |
| POST  | `/api/v1/imports`             | Повторить validation по актуальной БД и атомарно импортировать, 201   |
| GET   | `/api/v1/transactions/export` | CSV всех записей по текущим фильтрам списка, без ограничения страницы |

Деньги и даты проходят те же проверки, что ручной ввод операции: `financialSnapshot`,
`YYYY-MM-DD` без сдвига timezone, точность валюты из ICU. Курс к основной валюте
берётся из столбца строки, иначе из общего значения, заданного на шаге мастера для
всей валюты, иначе строка отклоняется с понятной причиной. Категория — только
собственная активная категория соответствующего типа; ссылка на чужую или
несуществующую категорию отклоняется одинаковым сообщением, без утечки чужого id.

Импорт разрешает **partial import**: валидные строки сохраняются, невалидные
пропускаются с причиной по каждой строке; непредвиденная ошибка БД откатывает весь
набор целиком — «частично импортировано» никогда не означает не долгую запись. Дубли
определяются эвристикой (владелец, дата, сумма, валюта, тип, нормализованное
описание) внутри файла и среди уже сохранённых операций; по умолчанию пропускаются,
явное `Включить вероятные дубли` на шаге проверки разрешает их сохранить. Каждая
импортированная запись получает `source=CSV` и собственную запись аудита в той же
транзакции, что и вставка.

Экспорт использует тот же построитель фильтров/сортировки, что список транзакций
(`/transactions`), без ограничения текущей страницы: `search/type/categoryId/dateFrom
/dateTo/amountMin/amountMax/currency/sort`. Ответ — `text/csv; charset=utf-8` с UTF-8
BOM (совместимость с Excel/LibreOffice), CRLF-переносами и `Content-Disposition:
attachment`. Значения, которые открылись бы как формула в табличном редакторе
(начинаются с `= + - @` либо табуляции/CR), получают защитный префикс `'` —
экспортированный файл безопасно открывать в Excel/Google Sheets/LibreOffice. Не
экспортируются `id`, `ownerId`, `createdAt`/`updatedAt`, recurring-связка — импорт
такого файла не может подделать эти поля.

`pnpm --filter @finora/api test` покрывает CSV parser (RFC4180, BOM, CRLF/LF/CR,
экранирование, malformed structure, лимит 10 000 строк), деньги/даты/timezone,
ownership, formula injection, атомарность partial import, повторный импорт/дубли,
аудит, интеграцию с budgets/dashboard, конкурентные одновременные импорты и файл на
10 000 строк без N+1 (фиксированное число SQL statements независимо от числа строк).
`pnpm test:e2e:auth` добавляет `csv-import.compose.spec.ts`: полный путь мастера,
повторный импорт, экспорт (BOM/formula injection) и мобильный viewport через
production Nginx. `pnpm test:e2e:stage9-stress` — 20 последовательных запусков этого
suite с `workers=1/2/4`, `retries=0`.

## Журнал изменений (Stage 10)

`/audit-log` — read-only список собственных записей аудита (пишется атомарно с
каждой доменной мутацией с Stage 4) с фильтрами и пагинацией.

| Метод | URL                 | Назначение                                                                          |
| ----- | ------------------- | ----------------------------------------------------------------------------------- |
| GET   | `/api/v1/audit-log` | Список: `entityType/entityId/action/dateFrom/dateTo`, newest-first, только владелец |

Мутирующих методов у ресурса нет: `POST/PATCH/DELETE /audit-log` — 404 (маршрут
не зарегистрирован), а не 403. Runtime-роль БД имеет только `SELECT, INSERT` на
`audit_entries` с Stage 4 (`scripts/grant-runtime.mjs`) — это подтверждено
`database.test.ts`. Чтение не джойнится с текущими `Transaction/Budget/Category
/RecurringTransaction`: удаление исходной записи и последующее переименование
категории не меняют уже прочитанный `before/after` — снимок заморожен на момент
мутации.

UI (`AuditLogPage`, `AuditDiff`) переводит known-поля каждого снимка в русские
подписи и показывает только реально изменившиеся поля вместо raw JSON; для
`CREATE`/`DELETE` показывается единственное состояние (`после`/`до`), для
`UPDATE`/`ARCHIVE` — только различающиеся поля как «было → стало».

`pnpm --filter @finora/api test` покрывает ownership isolation, фильтры/
пагинацию/сортировку, отсутствие мутирующих методов, атомарную полноту аудита
по всем четырём сущностям (`CREATE/UPDATE/DELETE/ARCHIVE`, включая каскадный
archive категории → активное recurring-правило) и сохранение истории после
удаления операции и последующего переименования её категории.
`pnpm --filter @finora/web test` покрывает loading/empty/error/retry, читаемый
diff (включая проверку, что неизменившееся поле не попадает в список), и смену
query-параметров фильтрами. `pnpm test:docker` добавляет `audit-acceptance.mjs`
по тому же контракту, что `budget-acceptance.mjs`: CRUD → `/audit-log` на
чистом checkout, cross-user isolation и устойчивость после повторного seed и
restart `api`. Отдельный Playwright `.compose.spec.ts` не добавлялся — ROADMAP
явно допускает это как необязательное расширение после обязательного smoke
suite; golden path дополнительно проверен вручную в реальном браузере.
