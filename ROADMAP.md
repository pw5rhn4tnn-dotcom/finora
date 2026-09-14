# Finora — план разработки

Статус: Stages 0–6 завершены и опубликованы; по сообщению пользователя последний remote GitHub Actions после двух CI repair-pass — GREEN. Stage 7 завершён, закоммичен (`1c683e1`) и опубликован; независимый acceptance-review подтвердил remote GitHub Actions на этом commit GREEN на GitHub-hosted Linux x86_64 (evidence — REPORT.md, раздел «Stage 7 — Remote CI / x86_64 Final Gate»). Stage 8 реализован и проверен локально (unit/integration/Docker/E2E) поверх HEAD `1c683e1`, но не закоммичен и не опубликован в этой сессии — commit/push выполняются только по отдельному разрешению пользователя; до commit и нового remote GitHub Actions run статус — LOCAL VALIDATION COMPLETE, не FINAL COMPLETE (детали — REPORT.md, раздел Stage 8). Stage 9–12 не начаты. Фактическая история — [REPORT.md](REPORT.md); продуктовые правила — [DISCOVERY.md](DISCOVERY.md), обязательные требования — [PROJECT.md](PROJECT.md), архитектура — [ARCHITECTURE.md](ARCHITECTURE.md).

Каждый Stage выполняется небольшими законченными задачами. Переход возможен после его критериев готовности и проверок; проверки, которых еще нет, не объявляются успешными. Для реализуемых функций применяется полный Definition of Done из `DISCOVERY.md`, раздел 36: серверная/клиентская validation, ownership, состояния UI, доступность, реальные тесты и актуальные контракты. Тесты, audit, документация и CI развиваются одновременно с функциями, а не откладываются целиком до Stage 11.

Общий набор проверок после появления инструментов: lint, format check, typecheck, релевантные tests и build затронутых приложений. Начиная со Stage 2 проверяется Docker build; при изменении startup — также Compose. Каждый этап ниже добавляет проверки к этому набору. Неприменимость конкретной проверки записывается с причиной. Никаких новых крупных функций за пределами Discovery; необязательные улучшения рассматриваются только после обязательной приемки.

## Stage 0 — Architecture & Project Record

**Цель:** создать согласованную документационную основу до кода.

**Входит:** полное изучение `PROJECT.md` и `DISCOVERY.md`; создание только `ARCHITECTURE.md`, `AI_RULES.md`, `ROADMAP.md`, `REPORT.md`, `README.md`; отдельная проверка согласованности и состава файлов.

**Не входит:** любое application code, каталоги приложений, package/workspace config, зависимости, Prisma schema, миграции, БД, Docker, workflow и тесты приложения. Исходные документы не переписываются.

**Зависимости:** доступны исходное задание и утвержденная Discovery-спецификация.

**Критерии готовности:** все пять документов созданы, ссылки и требования согласованы, planned/implemented различимы, код отсутствует, Stage 1 не начат.

**Обязательные проверки:** повторное чтение всех семи документов; покрытие обязательных требований; неизменность источников; отсутствие исключенных функций в обязательном плане; `git status`/`git diff` либо эквивалентная инвентаризация при отсутствии Git.

**Документация / REPORT:** начальная правдивая запись, реальный пример prompt, фактические проверки и предложенный commit. До начала Stage 1 новый Git-репозиторий и отдельный commit документации должны обеспечить требуемый порядок истории; commit выполняется только с разрешения пользователя.

## Stage 1 — Foundation

**Цель:** получить минимальные собираемые frontend/backend и воспроизводимые инструменты разработки.

**Входит:** после фиксации Stage 0 в Git — pnpm monorepo, пустые React/Vite и NestJS основы, strict TypeScript, lockfile и закрепление совместимых версий; общие lint/format/typecheck/build; конфигурация test runners; выбор OpenAPI generator и границы `packages/api-client`; начальный GitHub Actions pipeline.

**Не входит:** предметные экраны и CRUD, auth, заполнение БД, Prisma schema/migrations, Docker runtime, дизайн всех будущих компонентов и сквозная генерация продукта.

**Зависимости:** Stage 0; отдельная запись архитектуры в истории нового Git-репозитория до application code.

**Критерии готовности:** оба приложения собираются, scripts и workspace работают, версии воспроизводимы, lint/format/typecheck успешны. Test runner проверен на минимальном реальном smoke bootstrap без фиктивного набора бизнес-тестов. CI выполняет уже существующие проверки; PostgreSQL и Docker jobs добавляются в Stage 2.

**Обязательные проверки:** установка из lockfile; lint, format check, typecheck, smoke bootstrap, build обоих приложений; проверка конфигурации CI, фактический запуск GitHub Actions после появления доступного remote. Незавершенный remote-run отдельно отмечается, не выдается за успешный CI.

**Документация / REPORT:** реальные версии, структура, существующие команды; выбор generator/runner; результаты и ограничения CI; логический commit.

## Stage 2 — Database & Docker Runtime

**Цель:** рано доказать запуск трех сервисов одной командой и закрепить модель хранения.

**Входит:** Prisma schema для утвержденных сущностей, SQL constraints/indexes, миграции, decimal/date/timestamp conventions, богатый детерминированный идемпотентный seed (уточнение текущего задания Stage 2), его атомарность и сохранение пользовательских изменений; права runtime/миграций; HealthModule; production builds и Nginx proxy; Compose `web/api/postgres`, volumes, healthchecks, startup migrations → seed → API; логи/ошибки базовой инфраструктуры; Swagger и генерация клиента на реальном начальном контракте; PostgreSQL integration и Docker build в CI.

**Не входит:** завершенные финансовые сценарии приложения, пользовательская авторизация, дизайн приложения, CRUD API финансов, scheduler и CSV. Таблицы будущих модулей создаются как основа constraints; их продуктовая логика не реализуется.

**Зависимости:** Stage 1.

**Критерии готовности:** чистый `docker compose up` без `.env` и ручных действий запускает минимальный UI, API, PostgreSQL и живой Swagger; повторный запуск сохраняет данные без дублей. Выбраны и проверены порты, локальные demo defaults и startup-права. Наличие инфраструктуры не объявляется готовностью продукта. Генерация OpenAPI-клиента воспроизводима.

**Обязательные проверки:** базовый набор; real PostgreSQL integration constraints/precision; миграции на чистой БД; seed дважды; Docker build; Compose с новым и существующим volume; отказ БД/readiness; deep link UI и Swagger за Nginx; отсутствие обязательной локальной установки пакетов.

**Документация / REPORT:** фактические команды и адреса в README, правила локального HTTP/секретов, точность денег, поведение seed, подтвержденные результаты startup. Demo credentials публикуются только если уже созданы и проверены.

## Stage 3 — Design System & App Shell

**Фактическое состояние:** реализован; tokens/light theme, primitives, Query provider,
routing/sidebar/bottom navigation, responsive Sheet и каркас полей/фильтров готовы.
Vitest и браузерные Playwright/axe проверки добавлены в текущий pipeline. Результаты
локальной валидации и ограничения перечислены в REPORT. Требования ниже сохранены.

**Цель:** получить доступную адаптивную оболочку и основу визуального качества.

**Входит:** светлая token-based тема, typography/spacing, базовые shadcn/ui/Radix-компоненты по потребности; маршрутизация, sidebar и mobile bottom navigation; sheets/dialogs, каркас форм/фильтров, общие состояния; русский UI, `ru-RU`, reduced motion; структура pages/features/entities/shared и Query providers.

**Не входит:** auth как механизм безопасности, работающий CRUD, графики с выдуманными финансами, полная библиотека всех возможных компонентов, dark mode и декоративные эффекты. Незавершенные маршруты явно обозначены, mock-данные не выдаются за продукт.

**Зависимости:** Stage 2.

**Критерии готовности:** оболочка соответствует Discovery на desktop/mobile, навигация доступна с клавиатуры, dialog управляет focus, общие состояния имеют русские тексты, tokens переиспользуются.

**Обязательные проверки:** базовый набор и Docker build; компонентные проверки navigation/dialog/focus; ручная проверка desktop/mobile, контраста, labels, Escape и reduced motion.

**Документация / REPORT:** примененные tokens и компоненты, проверенные экраны/размеры, фактические UX-решения и ограничения.

## Stage 4 — Authentication & User Isolation

**Фактическое состояние:** завершён локально. AuthModule/UsersModule, Argon2id,
JWT cookie, register/login/logout/me, профиль/baseCurrency/timeZone, стандартные
категории с атомарным audit, guards/Origin/CORS/rate limits и auth UI реализованы.
Acceptance подтверждена реальной PostgreSQL и Playwright через production Nginx.
31 frontend tests, 29 backend tests по счётчику node:test (с родительскими tests),
15 прежних shell E2E и 11 auth Compose E2E — успешно; полный локальный эквивалент
CI зелёный. Schema/baseline и deterministic seed dataset сохранены.
На момент завершения Stage 4 Stage 5 не начинался; текущий статус указан ниже. Детали и ограничения — в REPORT.

**Цель:** обеспечить регистрацию, вход и серверную изоляцию данных.

**Входит:** AuthModule/UsersModule, Argon2id, JWT cookie и `/auth/me`, logout, настройки профиля/baseCurrency/timeZone; нормализация email и стандартные категории при регистрации; guards, Origin/CORS policy, rate limits, единый error contract и redaction; auth UI и demo access для фактически созданных аккаунтов. Минимальный audit writer и атомарный аудит создания категорий появляются здесь.

**Не входит:** роли/admin, shared family workspace, email verification/reset, refresh infrastructure, финансовый CRUD, полноценный экран audit. Наличие writer не означает начало Stage 10 UI.

**Зависимости:** Stage 3.

**Критерии готовности:** register/login/logout/me работают в Compose; email case-insensitive unique; default categories создаются атомарно с пользователем и audit; auth context — единственный источник владельца; нельзя читать/менять чужой профиль и передавать чужие связи. Правило смены baseCurrency проверяется на DB fixtures финансовых данных до появления их UI. Кэш очищается при смене пользователя.

**Обязательные проверки:** базовый набор; auth/изоляция integration с PostgreSQL; concurrent email registration; rollback регистрации/audit; неверный Origin, отсутствующий/просроченный JWT, rate limit; Playwright вход/выход через Nginx на текущую оболочку. Финальный login → dashboard проверяется после Stage 7.

**Документация / REPORT:** cookie/TTL/выход, точные лимиты и Origin-настройки, результаты security-проверок; только реальные demo credentials в README/Login screen.

## Stage 5 — Categories & Transactions Core

**Фактическое состояние: completed (локально, 2026-09-14).** Категории и операции,
архивирование, деньги/rate snapshots, ownership, фильтры/поиск/сортировки/pagination,
Sheet формы и atomic audit реализованы. Schema и достаточный rich seed сохранены.
42 backend tests (с родительскими node:test), 47 frontend tests, 15 shell E2E и
18 Compose E2E (11 auth + 7 finance) прошли. Полный локальный набор команд CI на macOS,
Docker clean/repeated startup, DB recovery и persistence после mutations — PASS.
Отдельный self-review выполнен, исправления проверены повторно. Stage 5 затем
закоммичен и опубликован (`352d4cb`); по данным пользователя remote CI прошёл.
Текущий Stage 6 описан ниже. История локальной приёмки — в REPORT.

**Цель:** получить полноценный ежедневный учет с корректной валютной моделью.

**Входит:** CRUD категорий с иконками/цветами и архивированием; CRUD операций, money/rate snapshots, блокировка baseCurrency после financial data; поиск по description/category, все фильтры Discovery, четыре сортировки, server pagination `10/25/50` и total. Sheet формы, desktop table/mobile cards, mobile filter sheet; audit каждой мутации. Развитие seed для операций и валют.

**Не входит:** бюджетные формы, dashboard/Insights, выполнение recurring, CSV и интерфейс журнала. Архивирование категории должно быть совместимо с будущими связанными правилами, но scheduler здесь не создается.

**Зависимости:** Stage 4.

**Критерии готовности:** полный CRUD с validation/ownership и состояниями UI; архивная категория остается в истории и не выбирается для новых записей; смена типа не ломает связи; суммы и rate рассчитывает сервер; фильтры/сортировка/pagination согласованы. Все мутации пишут audit в общей транзакции, история не теряется.

**Обязательные проверки:** базовый набор; PostgreSQL integration для типов/архивирования/FK/изоляции, audit atomicity, decimal и конкурентной смены baseCurrency; компонентные формы/фильтры; Playwright создание и фильтрация; desktop/mobile; Docker build.

**Документация / REPORT:** контракты/генерация клиента и Swagger, результаты financial/ownership проверок, фактический seed и изменения UX.

## Stage 6 — Budgets

**Статус:** завершён и опубликован. По сообщению пользователя последний remote GitHub Actions после Stage 6 и двух CI repair-pass — GREEN. История диагностики и локальных проверок сохранена в REPORT. Регрессии Stage 6 повторяются при приёмке Stage 7; schema, migration и seed не меняются.

**Цель:** добавить месячное планирование расходов и видимый прогресс.

**Входит:** CRUD бюджетов expense-категорий, выбор месяца, лимиты в baseCurrency, серверная агрегация расходов, progress/over-budget, audit; seed состояний около/сверх лимита.

**Не входит:** автоматический перенос бюджета, обязательное копирование прошлого месяца, dashboard целиком, scheduler/CSV/audit UI.

**Зависимости:** Stage 5.

**Критерии готовности:** уникальность `(userId, categoryId, year, month)` защищает от гонок; новые бюджеты недоступны для архивных/income-категорий; операции изменяют использование без отдельного счетчика; месяц и превышение корректно отображаются. Аудит CREATE/UPDATE/DELETE атомарен.

**Обязательные проверки:** базовый набор; PostgreSQL uniqueness/ownership/audit rollback; месячные границы, смена/удаление операции, превышенный лимит; компонентные формы и progress; Docker build.

**Документация / REPORT:** фактические бюджетные сценарии, тесты агрегации и уникальности, обновленные API/seed.

## Stage 7 — Dashboard & Financial Insights

**Статус:** завершён и опубликован (`1c683e1`). Все обязательные проверки текущего scope PASS на macOS и Linux/non-root; stress — по 20 последовательных запусков без retries на каждой платформе, включая тот же прогон внутри подтверждённого remote CI. Remote GitHub Actions на этом commit — GREEN на Linux x86_64. Полная продуктовая приёмка ближайших регулярных операций остаётся в Stage 8. Доказательства и ограничения — REPORT.

**Цель:** превратить историю операций в содержательную аналитику.

**Входит:** DashboardModule с server aggregation, выбор месяца, income/expense/net/savings rate, donut, line trend за выбранный и предыдущие пять месяцев, top-5, бюджеты; детерминированные Insights и их пороги/приоритеты, пустые состояния и textual chart summaries; аналитический seed.

**Не входит:** LLM/внешний советник, внешние FX API, настройка расположения dashboard, генерация recurring. Блок ближайших recurring остается честным пустым состоянием; реальные данные и обновления подключаются в Stage 8.

**Зависимости:** Stage 6.

**Критерии готовности:** все аналитические компоненты, кроме еще не подключенных recurring, работают на реальных данных; шесть месяцев и архивные категории учитываются правильно; при нулевом доходе нет деления на ноль; обоснованные Insights ранжируются и не выдумываются для пустой истории. Полная приемка dashboard по Discovery завершается после Stage 8.

**Обязательные проверки:** базовый набор; aggregation integration; unit Insights/нулевая база сравнения/savings rate; Playwright login → dashboard; смена месяца и обновление после операции, доступность диаграмм и mobile; Docker build.

**Документация / REPORT:** правила Insights с реальными порогами, результаты сверки расчетов, состояние dashboard и явная зависимость recurring-блока от Stage 8.

## Stage 8 — Recurring Transactions

**Статус:** реализован и проверен локально поверх подтверждённого Stage 7 HEAD (`1c683e1`): unit-календарь/timezone, HTTP CRUD/ownership/validation, scheduler catch-up/exhaustion/self-heal, concurrency (два независимых `PrismaClient` и четыре независимых OS-процесса на одно due правило), Docker acceptance (restart дважды на одну дату — occurrence создаётся один раз) — все PASS. Commit и push не выполнены в этой сессии; remote GitHub Actions на новом Stage 8 commit не запускался. Статус — LOCAL VALIDATION COMPLETE, не FINAL COMPLETE. Детали и найденные при self-review дефекты — REPORT.md.

**Цель:** надежно создавать ежемесячные операции автоматически.

**Входит:** правила и формы, Nest scheduler внутри API, IANA timezone, `nextOccurrenceDate`, start/end, catch-up, последний день месяца, DB idempotency, audit; архивирование/деактивация и допустимый hard delete; интеграция ближайших операций в dashboard; seed зарплаты/подписок.

**Не входит:** очереди, отдельный worker, другие частоты, изменение исторических операций вместе с шаблоном, CSV и экран audit.

**Зависимости:** Stage 7; transaction service и audit из предыдущих этапов.

**Критерии готовности:** downtime догоняется, restart/конкуренция не создают дублей; смена правила касается будущего, generated transaction редактируется независимо. Удаление generated transaction не позволяет воссоздать тот же occurrence; правило с фактом генерации не удаляется физически. Архивная категория не порождает новые операции. Dashboard получает реальные ближайшие правила.

**Обязательные проверки:** базовый набор; unit-календарь 28/29/30/31, leap year и timezone; PostgreSQL concurrency/unique/audit rollback/catch-up; restart Compose, удаленная generated transaction, изменение шаблона при накопленных пропусках, аудит продвижения даты и архивирование категории; компонентные формы; Docker build.

**Документация / REPORT:** реальные параметры scheduler, результаты повторных/пропущенных запусков, завершение recurring-блока dashboard, найденные проблемы календаря.

## Stage 9 — CSV Import / Export

**Цель:** безопасно загружать банковскую историю и выгружать отфильтрованные операции.

**Входит:** upload/parse/preview, column/category mapping с возвратом, validation, duplicate analysis с default skip и явным включением, partial import/result; курсы foreign-currency, 5 MB/10 000 строк/UTF-8; атомарный audit импортированных записей; экспорт всех результатов активных фильтров, CSV escaping/formula protection.

**Не входит:** автоматическое создание категорий, внешние курсы, история импортов, background processing, bank integrations, изменение бизнес-правил ради конкретного CSV.

**Зависимости:** Stage 8; общий transaction service, фильтры, audit writer и frontend shell.

**Критерии готовности:** пользователь исправляет mapping до записи; сервер повторно проверяет файл и ownership; невалидные строки пропускаются с причинами, допустимые дубли разрешены только явно. Отсутствующий rate не выдумывается. Экспорт включает записи за пределами страницы, без чужих данных. Неожиданный сбой DB не маскируется под успешный partial import.

**Обязательные проверки:** базовый набор; parser/encoding/limits/quotes/newlines, malformed dates/amounts, mapping/type/ownership, missing rate, дубли внутри файла и БД, partial result/audit rollback; экспорт по всем фильтрам и формульные префиксы; файл на границе 10 000 строк; Playwright CSV import и mobile wizard; Docker build.

**Документация / REPORT:** фактический формат CSV, принятые поля/форматы, результат граничных проверок и поведение повторной отправки, реальный пример использования.

## Stage 10 — Audit Log

**Цель:** сделать уже записываемую историю изменений доступной и понятной пользователю.

**Входит:** read-only audit API, фильтры/пагинация, экран списка и деталей, русский readable before/after diff, поддержка CREATE/UPDATE/DELETE/ARCHIVE всех четырех сущностей, исторических имен и удаленных записей; seed понятных изменений.

**Не входит:** начало записи аудита с нуля, выдуманная ретроистория, изменение/удаление audit пользователем, event sourcing, администрирование, необязательные расширенные фильтры.

**Зависимости:** Stage 9; audit writer и снимки, добавляемые начиная со Stage 4.

**Критерии готовности:** видны только собственные записи; immutable API и DB runtime-права подтверждены; UI показывает финансовые изменения текстом, не raw JSON; удаление сущности и последующее переименование категории не разрушают историю. Полнота аудита всех реализованных мутаций проверена.

**Обязательные проверки:** базовый набор; PostgreSQL ownership/immutability/snapshot checks и audit atomicity; компонентные before/after/empty/error/focus; ручной сквозной CRUD → журнал для каждого типа; Docker build. Дополнительный audit E2E возможен после обязательного smoke suite.

**Документация / REPORT:** покрытые действия, результаты проверки полноты/неизменяемости истории, примеры реальных diff и уточнения контрактов.

## Stage 11 — Hardening & Testing

**Цель:** закрыть реальные пробелы надежности и подтвердить приемку всего продукта.

**Входит:** проверка всех Acceptance Criteria Discovery и требований задания; завершение security/validation/edge cases, responsive/accessibility, redaction/errors/health; измерения запросов на десятках тысяч операций и необходимые индексы; полная автоматизация CI и Playwright smoke; финализация объема и качества seed. Исправления найденных дефектов небольшими задачами.

**Не входит:** новые крупные функции, переписывание архитектуры без доказанной проблемы, откладывание обязательных функций в nice-to-have, замена настоящих тестов заглушками, преждевременный Redis/observability stack.

**Зависимости:** Stage 10.

**Критерии готовности:** обязательные функции реализованы и проверены; минимум 10 unit/integration превышен, целевой suite 25–40 содержательных тестов плюс обязательный E2E smoke; real PostgreSQL integration. Seed соответствует минимумам задания и сценариям Discovery. CI включает install/lint/format/typecheck/tests/build/Docker build; живой Swagger и generated client соответствуют API.

**Обязательные проверки:** полный lint/format/typecheck/tests/build/Docker build; Playwright login → dashboard, создание/фильтрация операции, CSV import, user isolation; негативные cookie/Origin/ownership проверки; доступность/desktop/mobile; объемы seed; производительность списков, dashboard и больших CSV; чистый и повторный Compose startup.

**Документация / REPORT:** фактические числа тестов, команды и результаты, найденные дефекты/исправления, измерения производительности, оставшиеся только необязательные улучшения. Непройденная обязательная проверка блокирует следующий этап.

## Stage 12 — Deployment & Demo Preparation

**Цель:** подготовить воспроизводимую сдачу и содержательную пятиминутную демонстрацию.

**Входит:** финальная проверка чистого клона, startup без настройки, demo data и доступа, UI/API/Swagger; финальный README с реальными командами/адресами/credentials и тестированием; сверка ARCHITECTURE/ROADMAP с реализацией и завершение REPORT по реальной истории; доступный GitHub-репозиторий, успешный CI, логическая история commits; сценарий демонстрации в README. Видео — только необязательное дополнение.

**Не входит:** новая продуктовая функциональность, облачный hosting как условие сдачи, Kubernetes, подмена локального Compose внешним сервисом, фабрикация истории Git или REPORT.

**Зависимости:** Stage 11 и успешные обязательные проверки.

**Критерии готовности:** `git clone <repo>` → `cd <repo>` → `docker compose up` дает UI, REST API, Swagger и seeded PostgreSQL без ручной настройки. Два аккаунта независимы, demo показывает dashboard/Insights, CRUD, budgets, recurring, CSV и audit. Документация соответствует фактам; ARCHITECTURE присутствует в Git раньше кода; REPORT содержит реальные инструменты, удачи/неудачи/проблемы/решения и минимум один использованный prompt с разбором.

**Обязательные проверки:** полный pipeline и Playwright smoke на финальном состоянии; чистый клон без `.env`/volume и локальных пакетов; повторный запуск с volume; проверка README по шагам, Swagger, credentials и объемов seed; репетиция demo за 5 минут; итоговые Git status/diff/history.

**Документация / REPORT:** финальная фактическая запись, подтвержденные ограничения и результаты приемки, готовая инструкция сдачи. Commits и публикация выполняются только в рамках разрешения пользователя.

## Соответствие обязательным требованиям

| Требование                                                                  | Где реализуется и проверяется                                    |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| CRUD и validation; категории с цветами/иконками; поиск/фильтры/пагинация    | Stage 5; бюджеты Stage 6; повторная приемка Stage 11             |
| Адаптивность и русскоязычный UI                                             | Stage 3 и каждый UI-этап; финальная проверка Stage 11            |
| JWT, регистрация и два независимых аккаунта                                 | Stage 4, seed Stage 2–11; security E2E Stage 11                  |
| Мультивалютность и snapshot курса                                           | Stage 2/5, CSV/recurring Stage 8/9                               |
| Месячные бюджеты и прогресс                                                 | Stage 6                                                          |
| Dashboard: категории, top-5, график за шесть месяцев                        | Stage 7, recurring-блок Stage 8                                  |
| Автоматические ежемесячные операции                                         | Stage 8                                                          |
| CSV mapping/import и экспорт отфильтрованных данных                         | Stage 9                                                          |
| Audit с пользователем, временем, before/after и просмотром                  | Writer Stage 4, мутации Stage 5–9, интерфейс Stage 10            |
| Seed: 200+ операций / 6 месяцев / 12 категорий / 3 бюджета / 2 пользователя | Основа Stage 2, сценарии Stage 4–10, объем и приемка Stage 11/12 |
| REST и живой Swagger UI                                                     | Основа Stage 2, все API-этапы, проверка Stage 12                 |
| Минимум 10 unit/integration, целевые 25–40 и E2E                            | Постепенно Stage 1–10; полная приемка Stage 11                   |
| CI: lint, tests, build и принятые дополнительные проверки                   | Stage 1/2, расширение до Stage 11, успешный remote-run Stage 12  |
| Запуск одной командой без настройки                                         | Stage 2 и окончательная проверка Stage 12                        |
| Документация, реальный AI REPORT, Git history до/после кода                 | Stage 0 и каждый последующий этап; сдача Stage 12                |

Dark mode, копирование бюджетов, расширенные shortcuts/chart interactions, дополнительные Insights и улучшенные audit filters остаются необязательными согласно `DISCOVERY.md`, раздел 32. Исключенные возможности из раздела 34 не имеют этапа реализации.
