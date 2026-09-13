# PostgreSQL / Prisma foundation

## Соответствие источникам

Перед созданием schema использована следующая карта. Новые предметные сущности,
поля для счетов/сессий/import history и неутверждённые enum не добавлены.

| Требование                                    | Представление                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| DISCOVERY §20 users                           | `User`: ровно перечисленные поля; UUID PK, timestamps                                       |
| DISCOVERY §20 categories                      | `Category`: владелец, имя, тип, icon/color, archivedAt, timestamps                          |
| DISCOVERY §20 transactions                    | `Transaction`: суммы, валюта, rate snapshot, description/date/source, recurring-пара        |
| DISCOVERY §20 budgets; §7 uniqueness          | `Budget`, `@@unique([userId, categoryId, year, month])`                                     |
| DISCOVERY §20 recurring; §7 uniqueness        | `RecurringTransaction`, MONTHLY; unique recurring-пары в Transaction                        |
| DISCOVERY §20 audit; §7 snapshots             | `AuditEntry`, JSONB before/after, четыре entityType и действия CREATE/UPDATE/DELETE/ARCHIVE |
| ARCHITECTURE §9 ownership                     | Составные FK userId/categoryId и userId/recurringTransactionId                              |
| ARCHITECTURE §9 история                       | RESTRICT на FK, отсутствие FK audit.entityId на удаляемую запись                            |
| ARCHITECTURE §9 денежные/календарные проверки | SQL CHECK положительных amount/rate/limit, month 1–12, day 1–31, endDate >= startDate       |
| ARCHITECTURE §9 recurring-пара                | CHECK совместного NULL и обязательной пары для RECURRING                                    |
| DISCOVERY §7 email                            | SQL unique index на lower(email), без дублирующего case-sensitive unique                    |
| ARCHITECTURE §9 audit                         | CHECK формы snapshots; JSON null и не-объекты недопустимы                                   |
| DISCOVERY §30, ARCHITECTURE §9 запросы        | Индексы владельца/дат/категорий/типов, аудита и активных recurring                          |

`baseCurrency`, `currency`, `timeZone`, `themePreference` — строки: документы не
задают закрытые наборы значений для enum. Seed использует RUB/USD/EUR, Europe/Moscow
и light, не объявляя этим новый полный каталог поддерживаемых продуктом значений.
Проверки типа/активности категории, нормализации курса и запрета смены baseCurrency
потребуют транзакционных сервисов на своих этапах (ARCHITECTURE §9). Cross-table
CHECK и преждевременные предметные triggers здесь не создаются.

## Точность и даты

Суммы/лимиты: `NUMERIC(24,8)`, максимум `9999999999999999.99999999`; положительный
минимум хранения `0.00000001`. Курсы: `NUMERIC(24,12)`, максимум
`999999999999.999999999999`, минимум `0.000000000001`. SQL отвергает переполнение,
нулевые/отрицательные amount/rate/limit. PostgreSQL округляет излишние дробные знаки
до scale; будущая входная validation должна отвергать избыточную точность до записи.
Это диапазоны persistence, а не введённые ограничения будущих форм.

Seed создаёт Decimal из строк, умножает Decimal на Decimal/string, округляет normalized
amount половиной вверх до двух знаков для RUB/USD/EUR. JS number используется для
индексов и календаря, не для финансовой арифметики. Audit хранит decimal strings.
Business dates — DATE, системные timestamps — TIMESTAMPTZ(3). UTC Date используется
как технический носитель календарных компонентов Prisma; даты не сдвигаются по
timezone машины. Здесь нет scheduler или вычисления пользовательского today.

## Миграции и доступ

`20260913000000_initial/migration.sql` содержит полную схему, индексы, FK и CHECK.
Baseline получен `prisma migrate diff --from-empty --to-schema prisma/schema.prisma
--script`, затем дополнен указанным SQL. `prisma migrate deploy` применяется к пустой
и существующей БД. `db push` не используется. Новые изменения схемы требуют новых
миграций, применённый baseline не редактируется.

Prisma 7.10.0 использует `@prisma/adapter-pg` 7.10.0 и pg 8.23.0. Prisma client
генерируется в `src/generated/prisma`, игнорируется Git, компилируется вместе с API.
`prisma.config.ts` читает миграционный URL. Runtime получает отдельный DATABASE_URL.
Nest PrismaService подключается/отключается через lifecycle без repository-обёртки.

Локальный `finora_migrator` — привилегированная bootstrap/migration-роль официального
PostgreSQL image. `grant-runtime.mjs` под DB lock создаёт публичную demo-роль
`finora_runtime`, выдаёт DML только пяти таблицам и SELECT/INSERT для audit, запрещает
schema CREATE. Runtime не получает DDL, TRUNCATE или UPDATE/DELETE audit. Его права
не включают `_prisma_migrations`. Миграционная переменная удаляется из окружения
процесса Nest после startup. Это локальная demo-конфигурация, не production provisioning.

## Seed

Единая DB transaction берёт advisory lock `(706913, 2)`. Стабильный ID audit CREATE
последней категории семейного профиля служит признаком завершения и вставляется
последним. Это обычный правдивый snapshot Category, без новой таблицы или action.
Все seed-строки, включая marker, фиксируются вместе; ошибка откатывает весь набор.

При повторном запуске наличие marker означает пропуск записи. Seed не выполняет
безусловный upsert, не перетирает edits, не воскрешает удалённые операции. Маркер
защищён insert/select-only правами audit. Если marker отсутствует, но стабильные
IDs/emails уже заняты, seed завершается ошибкой с rollback, а не смешивает наборы.

`SEED_ANCHOR_DATE=YYYY-MM-01` фиксирует последний месяц истории. Если значения нет,
первый запуск выбирает текущий UTC-месяц. Даты первого месяца сохранены в стабильных
seed-записях; после restart опора восстанавливается из marker, даже если env изменён.
Для двух пустых БД при одной опоре весь dataset, включая hashes/timestamps/IDs,
совпадает. Idempotency дополнительно проверяется полным SHA-256 снимком всех строк.

Набор: 2 профиля, 16 категорий, 288 transactions (120 личных, 168 семейных), 16 budgets,
6 recurring rules (зарплата, аренда, музыкальная подписка каждого профиля), 364 audit
entries. История содержит шесть месяцев, MANUAL/CSV/RECURRING, RUB/USD/EUR, фиксированные
курсы, near/over-budget, высокий/низкий savings rate. Audit включает создания,
36 продвижений recurring-даты и 2 уточнения суммы/описания. Seed записывает готовые fixtures;
не запускает scheduler, CSV importer или analytics engine.

Публичные demo-пароли хешируются встроенным Node 24 Argon2id (64 MiB, 3 прохода,
parallelism 1) с разными детерминированными demo-солями. Это исключение только для
воспроизводимого публичного набора; будущая регистрация должна использовать случайную
соль. Auth flow отсутствует на Stage 2.
