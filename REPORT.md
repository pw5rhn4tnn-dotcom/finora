# Finora — журнал разработки

## 13.09.2026 — Stage 0: архитектура и проектная документация

### Исходное состояние и Discovery

Проект начинается с учебного задания [PROJECT.md](PROJECT.md): full-stack приложение, созданное с помощью AI, с обязательными функциями варианта 1 — трекера личных финансов, тестами, CI, seed, живым Swagger и запуском через Docker Compose без ручной настройки.

До этой сессии было проведено Discovery с AI и создан [DISCOVERY.md](DISCOVERY.md) — утвержденная каноническая спецификация Finora v1.0. Это исходное состояние, предоставленное пользователем; повторное Discovery в Stage 0 не проводилось. Полная переписка, конкретный инструмент предыдущего Discovery и его неудачные итерации в текущей сессии не представлены, поэтому не реконструируются.

По итогам Discovery выбран Finora — продукт личных финансов с самостоятельными пользовательскими аккаунтами. Зафиксированы категории решений: видение и границы продукта; сценарии, русский UX и визуальное направление; финансовые/календарные правила; модель данных и API; безопасность; CSV, recurring и audit; тестирование, demo-данные, deployment, производительность и приемка.

Приняты React/TypeScript/Vite и NestJS/Prisma/PostgreSQL, monorepo с pnpm workspaces и модульный монолит. Внешний FX API исключен: курс хранится как snapshot, недостающий курс вводит пользователь. Приоритет — zero-setup Docker Compose. Scope сознательно ограничен: без счетов/кошельков, общего семейного пространства, дополнительных ролей, банковских интеграций, LLM и распределенной инфраструктуры. Необязательный polish не вытесняет требования задания.

### Использованный AI и выполненная работа

На Stage 0 использован **Codex в desktop-приложении** для чтения локальных источников, подготовки Markdown и проверки согласованности. Инструменты сессии: чтение через shell, внесение документов через `apply_patch`, проверка состава файлов и контрольных сумм. Подагенты не использовались; внешние исследования и установка зависимостей не выполнялись.

До создания документов полностью изучены `PROJECT.md` и `DISCOVERY.md`. Подготовлены `ARCHITECTURE.md`, `AI_RULES.md`, `ROADMAP.md` и README skeleton; этот REPORT содержит только начальную запись. Архитектура описывает технический механизм требований, roadmap — Stage 0–12 с отдельными границами и проверками. Исходные документы не переписаны.

### Реальный показательный prompt

Дословный фрагмент задания пользователя текущей сессии:

> На этом этапе разрешена только работа с проектной документацией.
>
> **Application code создавать запрещено.**

В том же реальном запросе требовалось полностью изучить `PROJECT.md`/`DISCOVERY.md`, создать только пять названных документов и выполнить отдельный self-review.

Разбор: prompt задал проверяемую границу этапа и приоритет источников. Результат — документационная основа без application code и без начала Foundation. Подробные требования к architecture/roadmap позволили закрепить порядок внедрения audit, auth, БД и Docker до реализации сложных функций. Успешный runtime этим результатом не подтверждается: он еще не существует.

### Решения, проблемы и ограничения

Полезное организационное решение — отделить спецификацию, технический план, этапы и фактический журнал. В архитектуре особо выделены ранний Compose startup, same-origin cookie-auth, decimal-арифметика и атомарный audit с первой мутации. Их техническая работоспособность будет проверяться на будущих этапах.

При начальном чтении суммарный вывод источников оказался обрезан. Файлы повторно прочитаны полностью отдельными диапазонами, включая последнюю строку, до создания документов. Утилита `rg` оказалась недоступна; для инвентаризации использованы стандартные средства shell. Это фактические затруднения текущей сессии, а не дефекты приложения.

Git-проверка показала, что рабочий каталог пока не является репозиторием. Git не инициализировался и commit не выполнялся. Требование задания об истории сохраняется: до первого application code необходимо создать новый Git-репозиторий и отдельно зафиксировать архитектурную документацию с разрешения пользователя. Это условие перехода к Stage 1, а не выполненное действие.

Неудачных реализационных решений, ошибок runtime, тестов или deployment на Stage 0 еще нет: реализация не начиналась. В следующих записях необходимо по мере появления фиксировать реальные AI-инструменты, удачные и неудачные шаги, ключевые проблемы, способы решения и результаты проверок, не дописывая вымышленную историю задним числом.

### Состояние результата

Application code, `apps/web`, `apps/api`, package/workspace config, dependencies, Prisma schema, migrations, БД, Dockerfiles/Compose, workflow и application tests не созданы. README явно маркирует будущие возможности и не содержит выдуманных адресов, портов, credentials или несуществующих команд. Stage 1 не начат.

### Отдельная проверка документов

Повторно прочитаны все семь документов: `PROJECT.md`, `DISCOVERY.md`, `ARCHITECTURE.md`, `AI_RULES.md`, `ROADMAP.md`, `REPORT.md`, `README.md`. Противоречий между исходным заданием и Discovery не обнаружено. Обязательные требования сопоставлены с этапами в завершающей таблице roadmap; ничего обязательного не переведено в необязательные улучшения. Исключенные возможности не включены в план реализации. Русский язык основного текста и сохранение английских технических identifiers проверены; будущие возможности отделены от текущего состояния.

При self-review уточнены два пропуска первоначального технического описания: перед изменением recurring-шаблона требуется восстановить накопленные прошлые occurrence по прежним параметрам; автоматическое продвижение `nextOccurrenceDate` также получает audit `UPDATE`. Обе проверки добавлены в Stage 8. Исправлена опечатка в описании сессии без серверного состояния. Утвержденные источники не менялись.

Выполнена локальная проверка стандартными средствами Python без установки зависимостей и без создания дополнительных файлов:

- SHA-256 обоих источников совпадает с состоянием до изменений.
- В каталоге ровно семь Markdown-файлов: два исходных и пять новых; других артефактов нет.
- Все 20 локальных Markdown-ссылок разрешаются; блоки кода закрыты, лишние пробелы на концах строк в новых документах отсутствуют.
- В архитектуре 27 обязательных разделов; roadmap содержит Stage 0–12, у каждого есть все семь обязательных полей.

Проверка состава файлов использована вместо Git diff, поскольку репозиторий не инициализирован. Lint, typecheck, application tests, E2E, build и Docker checks не запускались: соответствующих приложений и конфигурации на Stage 0 нет. Успешная проверка документации не является проверкой будущего runtime.

Stage 0 завершен в пределах документации. Предлагаемый commit: `docs: зафиксировать архитектуру и план разработки Finora`. Commit не выполнен. Следующий этап — Stage 1 — Foundation; он не начат.

## 13.09.2026 — Stage 1: Foundation

### Preflight и границы

Использован Codex desktop: shell, apply_patch и официальные веб-источники для
проверки версий. Подагенты не использовались. Перед изменениями полностью прочитаны
все семь документов source of truth, включая Stage 1 roadmap. Общий вывод был
обрезан, поэтому документы дочитаны диапазонами. `rg` отсутствует; использованы
`find`, `sed` и стандартные средства. Повторное Discovery не проводилось.

Рабочая директория — существующий проект Finora; `git status` показал чистое
дерево. Ветка `main`, remote `origin` — `https://github.com/pw5rhn4tnn-dotcom/finora.git`.
История: `bb3ff1a` — отдельная документация Stage 0, затем `15bff79` — `.gitignore`.
Первый commit содержит ровно семь Markdown-документов, без application code.
Тем самым условие истории выполнено до Stage 1; сообщение Stage 0 об отсутствии
Git остается исторической записью, а не текущим blocker. Среди игнорируемых файлов
обнаружен только существующий `.DS_Store`, он не изменялся.

Реальный фрагмент текущего prompt пользователя:

> Это Foundation, а не начало реализации продукта.

Граница обеспечена составом файлов: только monorepo/tooling, минимальные приложения,
smoke tests, описание api-client и текущий CI. Предметных модулей, финансовых данных,
Prisma, Swagger-схемы, Docker, auth и предметных экранов не создавалось.

### Версии и совместимость

| Инструмент                              | Закрепленная версия                          |
| --------------------------------------- | -------------------------------------------- |
| Node.js LTS                             | 24.21.0, `.nvmrc` и точный `engines.node`    |
| pnpm                                    | 12.4.1, `packageManager`, engines и lockfile |
| React / React DOM                       | 19.3.0                                       |
| Vite / React plugin                     | 8.3.0 / 6.1.1                                |
| TypeScript                              | 6.0.3                                        |
| NestJS common/core/platform-express     | 12.0.1                                       |
| Nest CLI                                | 12.0.0                                       |
| ESLint / @eslint/js / typescript-eslint | 10.10.0 / 10.0.1 / 8.70.0                    |
| Prettier                                | 3.9.6                                        |
| Frontend runner                         | Vitest 4.1.11                                |
| Testing Library React / DOM             | 16.3.3 / 10.4.1                              |
| jsdom                                   | 30.0.1                                       |
| Backend runner                          | Встроенный `node:test` из Node.js 24.21.0    |
| OpenAPI generator                       | Orval 8.33.0, выбран, пока не установлен     |

Остальные прямые зависимости также exact: `@types/node` 24.13.4,
`@types/react`/`@types/react-dom` 19.3.0, `reflect-metadata` 0.2.2, RxJS 7.8.2,
`globals` 17.12.0, `eslint-plugin-react-hooks` 7.1.1 и
`eslint-plugin-react-refresh` 0.5.6. Lockfile закрепляет транзитивный граф.

До установки проверены npm metadata (`engines`, `peerDependencies`, optional peers)
и официальный список Node releases. Node 24.21.0 — актуальный доступный LTS.
Vite 8/plugin-react 6 требуют Node 20.19+ либо 22.12+, jsdom 30 — Node 24.15+
в выбранной ветке; NestJS 12 требует Node 20+. ESLint 10 и typescript-eslint 8
совместимы. TypeScript 7.0.2 из latest сознательно не выбран: typescript-eslint
8.70.0 требует TypeScript `<6.1.0`; Nest CLI также использует ветку `~6.0.2`.
React DOM 19.3 и Testing Library 16 поддерживают выбранный React 19.3.

Источники: [Node releases](https://nodejs.org/dist/index.json),
[Vite 8](https://vite.dev/blog/announcing-vite8),
[TypeScript 6](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html),
[npm: typescript-eslint](https://registry.npmjs.org/typescript-eslint/8.70.0),
[npm: Vitest 4.1.11](https://registry.npmjs.org/vitest/4.1.11).

### Runner, генератор и созданная основа

Frontend: React монтирует минимальный русский placeholder. Vitest/Testing Library
проверяют доступный заголовок и содержимое `main` в jsdom. Demo assets и предметные
компоненты отсутствуют; Query providers, router и CSS framework не устанавливались.

Backend: ESM/NodeNext, обычный `tsc` через Nest CLI, strict TypeScript с
`experimentalDecorators`/`emitDecoratorMetadata`. Один корневой `AppModule` без
предметных модулей и controllers. Общий `bootstrap` используется entrypoint и
тестом. Сервер слушает loopback, тест использует порт 0, разрешает AppModule через
Nest DI, делает настоящий HTTP-запрос с ожидаемым 404 и закрывает приложение.
При ошибке listen ресурсы закрываются и ошибка пробрасывается; main пишет ошибку
и выставляет ненулевой exit code. Технический endpoint для этого не понадобился.

Окончательный backend runner — стабильный `node:test`. Перед запуском тестов
исходники и тесты компилируются стандартным TypeScript в очищаемый `dist-test`.
Это сохраняет metadata Nest и использует штатную загрузку ESM Node без отдельного
трансформера. Nest testing utilities могут быть добавлены при реальной потребности;
Foundation проверяет настоящий NestFactory непосредственно. Это не подмена будущих
PostgreSQL integration тестов. [Node test runner](https://nodejs.org/docs/latest-v24.x/api/test.html).

Выбран Orval 8.33.0: получает Nest-generated OpenAPI, генерирует TypeScript
client/types, поддерживает Fetch и будущие React/TanStack Query hooks. Сравнены
`openapi-typescript` 7.13.0 (прежде всего types, клиентный runtime выбирается отдельно)
и `@hey-api/openapi-ts` 0.99.0 (подходящая альтернатива с плагинами). Orval напрямую
покрывает принятую связку; добавлять генератор до реального контракта не требуется.
`packages/api-client` содержит только private manifest и русское описание границы,
без exports, DTO, fake contract и фиктивных scripts. На Stage 2 Orval именно этой
версии будет установлен в пакет и lockfile; реальная Swagger-схема станет входом
генерации, CI будет проверять воспроизводимость и рассинхронизацию. Цикл генерации
пока не выполнен. [Orval Fetch](https://orval.dev/docs/guides/fetch-client/),
[Orval TanStack Query](https://orval.dev/docs/guides/react-query/),
[openapi-typescript](https://openapi-ts.dev/introduction),
[Hey API](https://heyapi.dev/openapi-ts/get-started).

Root scripts: `dev:web`, `dev:api`, `lint`, `format`, `format:check`, `typecheck`,
`test`, `build`. ESLint проверяет TypeScript с type information; `strict` включен,
`skipLibCheck: false`, необоснованных any/подавлений нет. Общие конфиги находятся в
корне. Prettier не переписывает исходные PROJECT/DISCOVERY/AI_RULES и pnpm lockfile.
Фактические команды и структура опубликованы в README. Архитектура уточнена по
runner/generator/runtime и текущему Git, продуктовые решения не менялись.

### Возникшие проблемы и исправления

- В shell был выбран Node 8.17.0/npm 6.13.4, команды pnpm/Corepack отсутствовали в
  PATH. Обнаружены ранее установленные Node 24.18.0 и Corepack 0.35.0. Для проверки
  актуального LTS официальный Node 24.21.0 скачан в `/private/tmp`, SHA-256 архива
  сверена с официальным SHASUMS256. Corepack/pnpm и store также подготовлены во
  временном каталоге. Глобальные установки, настройки shell, sudo и nvm default
  не менялись. Временный pnpm launcher добавлен только в PATH проверочных команд,
  чтобы рекурсивные root scripts могли найти `pnpm`.
- Sandbox блокировал DNS registry; установка и запросы версий выполнены с сетевым
  разрешением. У Python HTTPS не нашлась цепочка CA: использован HTTPS Node.js с
  включенной проверкой TLS, без отключения certificate verification.
- Новый pnpm 12 отклонил вспомогательный `--cache-dir`; параметр убран, store
  передавался поддерживаемым `--store-dir`. Первая установка остановилась на
  неразрешенных install scripts `@parcel/watcher` и `unrs-resolver`. Scripts были
  прочитаны и точечно разрешены. После отказа от Jest обе зависимости исчезли из
  lockfile, и временные allowBuilds удалены. В итоговом графе они не нужны.
- Сначала попробованы Jest 30.5.1 + ts-jest 29.4.12: typecheck выявил несоответствие
  Node16/CommonJS новым ESM-пакетам NestJS 12, а ts-jest — необходимость явного
  rootDir для TypeScript 6. После уточнения NodeNext/rootDir Jest все равно не
  загрузил ESM Nest. Выбран более простой стандартный node:test с tsc; Jest,
  ts-jest, их конфиг и зависимости полностью удалены. ESM-поддержка Jest описана
  как экспериментальная в [официальной документации](https://jestjs.io/docs/ecmascript-modules).
- Vitest 5.0.0 не прошел проверку типов: отсутствующий `@vitest/expect` и экспорт
  `MarkOptions` в опубликованных declarations. Вместо отключения проверки библиотек
  закреплен Vitest 4.1.11, чей peer range включает Vite 8. Повторные frontend test,
  typecheck и build прошли.
- Первый настоящий backend smoke остановился на `listen EPERM` из-за sandbox.
  После разрешения loopback listen тот же тест прошел, без mock HTTP или изменения
  ожиданий. Первые неудачные команды не считаются успешными проверками.

### Ход проверки

На этом шаге успешно выполнены lint, typecheck, отдельные frontend/backend tests
(по одному содержательному тесту), отдельные сборки frontend/backend. Проверки
чистой установки, dev-команд, полного root pipeline и отдельный self-review
продолжаются; финальные результаты будут записаны ниже после фактического запуска.

### Итоговые проверки и воспроизводимость

После удаления устаревших allowBuilds запуск `pnpm format` попытался автоматически
переустановить зависимости: pnpm 12 по умолчанию выполняет install при изменении
конфигурации, причем без ранее переданного CLI-пути store. Попытка в sandbox
остановлена после DNS-ошибок. Настроено `verifyDepsBeforeRun: error`: проверочные
scripts больше не выполняют неявный reinstall. Установка запущена явно и успешно,
временный store выбран переменной только в проверочной среде. Последующие команды
format и format:check прошли.

Создана отдельная копия только Git-visible исходников (35 файлов) в новом каталоге
`/private/tmp`. В ней отсутствовали `.git`, `node_modules`, `dist`, `dist-test`,
`.env` и посторонние файлы. Использован отдельный новый пустой pnpm store:
`pnpm install --frozen-lockfile` загрузил 416 пакетов, `reused 0`, завершился с
кодом 0. Затем в этой же копии последовательно выполнен весь набор команд CI.
SHA-256 `pnpm-lock.yaml` до и после установки/проверок совпал. Рабочая среда проекта
ради clean install не удалялась. Проверка проведена на macOS arm64; Linux runner
GitHub будет проверен первым remote run.

| Команда / проверка                                                | Фактический результат                                                            |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                  | Успех в рабочем каталоге и в чистой копии с пустым store; lockfile неизменен     |
| `pnpm lint`                                                       | Успех, без warnings; повторно в чистой копии                                     |
| `pnpm format`                                                     | Успех; отформатированы изменяемые файлы                                          |
| `pnpm format:check`                                               | Успех в чистой копии                                                             |
| `pnpm typecheck`                                                  | Успех для обоих приложений, тестов и конфигов; повторно в чистой копии           |
| `pnpm --filter @finora/web test`                                  | Успех: 1 компонентный smoke test                                                 |
| `pnpm --filter @finora/api test`                                  | Успех: 1 настоящий Nest HTTP bootstrap test                                      |
| `pnpm test`                                                       | Успех: все 2 теста, также в чистой копии                                         |
| `pnpm --filter @finora/web build`                                 | Успех: frontend production bundle                                                |
| `pnpm --filter @finora/api build`                                 | Успех: исполняемый ESM backend                                                   |
| `pnpm build`                                                      | Успех: обе сборки, также в чистой копии                                          |
| `pnpm dev:web`                                                    | Успех: Vite на 127.0.0.1:5173, HTTP 200 и HTML Finora                            |
| `pnpm dev:api`                                                    | Успех: Nest watch, HTTP 404 на 127.0.0.1:3000                                    |
| `pnpm --filter @finora/api start`                                 | Успех: собранный backend отвечает HTTP 404                                       |
| `pnpm list -r --depth 0` и проверка manifests/scripts             | Успех: root и 3 workspace-пакета, 25 прямых dependency declarations, все private |
| `git diff --check`, status/diff, проверка состава файлов и hashes | Успех; исходные PROJECT/DISCOVERY/AI_RULES побайтно неизменны                    |

Dev-серверы и собранный backend после smoke-проверки остановлены. HTTP 404 означает
отсутствие маршрутов, а не готовность будущего API. Два теста — минимальный набор
Foundation; минимум и целевое покрытие полного продукта остаются требованиями
последующих этапов, не объявляются достигнутыми.

### CI и отдельный self-review

Создан `.github/workflows/ci.yml`: push/pull_request, только `contents: read`,
Node из `.nvmrc`, pnpm из `packageManager`, frozen install, lint, format check,
typecheck, tests, build. Проверены актуальные major-версии официальных Actions:
[checkout v7](https://github.com/actions/checkout),
[setup-node v7](https://github.com/actions/setup-node),
[pnpm/action-setup v6](https://github.com/pnpm/action-setup).
Конфигурация проверена чтением и Prettier; все ее shell-команды успешно выполнены
локально в чистой копии. GitHub runner фактически не запускался.
**Remote CI — pending verification**, поскольку commit/push запрещены заданием.

Отдельно перечитаны исходники, конфиги, manifests, CI и diff документации.
Проверены scope, границы packages, scripts и отсутствие прежних Jest-зависимостей
в lockfile. Strict не отключен, подавления и фиктивные assertions отсутствуют.
Новых предметных модулей/экранов, Prisma/Docker/auth, fake API и преждевременных
абстракций нет. Каждый прямой пакет используется runtime, компилятором, lint,
тестами или dev/build tooling; peer conflicts при чистой установке отсутствуют.
У api-client сознательно нет кода и искусственных успешных scripts.

Проверены Git-visible файлы на случайные artifacts, `.env`, приватные ключи и
типичные token patterns, а каталоги исходников — на nested `.git`: проблем не
обнаружено. `node_modules`, `dist`, `dist-test` и существующий `.DS_Store`
игнорируются. В Git 5 измененных существующих файлов и 27 новых файлов; commits
и push не выполнялись. Смысловые изменения ARCHITECTURE касаются только Foundation
и актуального Git; дополнительные изменения таблиц ARCHITECTURE/ROADMAP —
форматирование Prettier. Содержание PROJECT/DISCOVERY/AI_RULES сохранено.

Stage 1 локально готов. Единственная pending-проверка — remote GitHub Actions.
Stage 2 не начат: БД, Docker runtime, health и реальный Swagger → client cycle
остаются его запланированной областью, а не недоделками Foundation.
Предлагаемый commit: `chore(foundation): создать monorepo и проверяемую основу Finora`.

## 13.09.2026 — Stage 2: Database & Docker Foundation

### Preflight и реализация

Использован Codex desktop, shell/apply_patch, официальные Prisma/NestJS/npm metadata.
Подагенты не использовались. Полностью прочитаны семь входных документов до изменений;
обрезанный общий вывод дочитан отдельными диапазонами. Рабочее дерево было чистым,
Stage 1 зафиксирован commit `b76f546`, Stage 0 предшествует application code.

Текущий prompt явно требует богатый seed уже на Stage 2; он уточняет прежнюю границу
ROADMAP с минимальным seed. Авторизация, предметный CRUD, scheduler, CSV и UI Stage 3+
не добавляются. Исходные PROJECT/DISCOVERY/AI_RULES не меняются.

Реальный фрагмент prompt: «Stage 2 должен оставить после себя не набор конфигурационных
файлов, а воспроизводимую database/infrastructure foundation Finora». В результате
проверяется реальный cold start из копии Git-visible исходников без host node_modules.

Сопоставление всех моделей и ограничений с источниками записано в
`apps/api/prisma/README.md`. Созданы шесть Prisma-моделей, baseline SQL migration,
Decimal/date conventions, Nest Prisma lifecycle, health, русский Swagger, Problem
Details и безопасные JSON request logs. Orval 8.33.0 генерирует Fetch client двух
инфраструктурных endpoints. Новые предметные endpoints отсутствуют.

### Промежуточные результаты и проблемы

- Prisma/client/adapter-pg закреплены на стабильной 7.10.0. npm latest у Prisma
  указывал 8.0.0-rc.14: release candidate не выбран. Swagger 12.0.1 совместим с Nest 12.
  Foundation зависимости сохранены. pg 8.23.0 и @types/pg 8.23.1 закреплены lockfile.
- Установка завершилась после явных allowBuilds для Prisma engines/preinstall и
  esbuild; необязательный telemetry script @scarf/scarf отключён. pnpm сам добавил
  age exceptions для уже согласованной Orval 8.33.0 и её пакетов; версии точные.
  Автоматически добавленные placeholders allowBuilds первоначально дали YAML error,
  затем исправлены. После этого install и Prisma generate прошли.
- Импорт Orval defineConfig в TS тянул неполные declarations debug/picomatch/faker.
  Конфиг переведён в обычный MJS declarative object, который читает сам Orval.
  Generated TypeScript остаётся под strict typecheck, skipLibCheck не включался;
  mock dependencies для исправления чужих declarations не устанавливались.
- Docker Desktop был остановлен. Запущен установленный Desktop. Обычный public pull
  завис в docker-credential-desktop. Для проверок использован отдельный временный
  Docker config без credentials с тем же daemon и установленными CLI plugins;
  настройки/credentials пользователя не менялись. Anonymous pull PostgreSQL успешен.
- PostgreSQL integration успешно проверили пустую migration, повторный deploy,
  параллельный/повторный seed, равенство двух пустых БД при фиксированной опоре,
  money precision/overflow, FK/uniques/CHECK, runtime audit permissions, rollback,
  содержательность budget/analytics fixtures и сохранение пользовательских edits.
  Настоящий Nest HTTP bootstrap прошёл, включая DB outage: live 200, ready 503,
  затем ready 200 после восстановления. Frontend smoke сохранён и прошёл.
- Первый Compose build обоих приложений успешен, но startup API остановился:
  pnpm verifyDepsBeforeRun заметил неполную workspace-структуру runtime image.
  Исправление: pnpm deploy --prod формирует самостоятельный runtime, а startup
  вызывает установленный Prisma CLI напрямую через Node. Политика проверок pnpm
  в рабочем monorepo не ослабляется. Повторная Docker-приёмка продолжается.

### Итоговые validation и отдельный self-review

После исправления runtime упаковки clean-source acceptance прошёл. На отдельной
чистой копии без `.env` и `node_modules` команда `docker compose up -d --wait`
(без `--build`) сама собрала Web/API, создала новую PostgreSQL, применила migration,
выдала права, загрузила seed и дождалась трёх healthy-сервисов. Проверены UI, deep
link fallback, API live/ready, `/docs`, OpenAPI JSON и Swagger JS. Отсутствующий
предметный endpoint возвращает 404, не фиктивные финансовые данные.

После остановки PostgreSQL live остался 200, ready стал 503; после возврата БД
готовность восстановилась. Выполнены seed ещё три раза и down/up с сохранённым
volume. Полные отсортированные снимки всех шести таблиц совпали, а не только counts.
Итоговый dataset SHA-256 при опоре 2026-09-01:
`55c7d9a51be58a2b6d685feb3d3057333c2dfd7fe6be729cbce3bf436a4c89b0`.
Acceptance runner завершает свой стек и удаляет свой volume в finally.

Дополнительно обычный checkout поднят через `docker compose up -d --wait` без
`.env` и без `--build`: стандартные localhost:8080, `/docs` и readiness подтверждены
HTTP 200. Первичный HTTP-запрос был отправлен ещё до завершения асинхронной сборки
и не подключился; после завершения wait проверка прошла. Это не засчитано как
успешная первая HTTP-попытка. Root `db:setup`, dev API/Vite proxy и собранный API
проверены отдельно. Первому dev listen помешал sandbox EPERM; после разрешения
loopback listen те же команды прошли, без изменения приложения ради sandbox.

Полный pipeline выполнен из чистой копии: frozen install, lint, format:check,
typecheck, test, build, db:validate, api:check — exit 0. Первый clean install
использовал общий content-addressable store: pnpm 12 не применил переданную
npm_config_store_dir. Поэтому дополнительно создана ещё одна чистая копия и явно
выполнен `pnpm --store-dir <новый-пустой-store> install --frozen-lockfile`:
631 пакетов, reused 0, downloaded 631, exit 0. Один DNS retry typedoc восстановился
автоматически. Lockfile до/после всех установок одинаков:
`9b3fecfbb5795714116011e6d4ad743380a84bdac4eb62c2996857fbdb73602e`.

| Реально выполненная команда/проверка                           | Результат                                                                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                               | Успех в рабочем каталоге и clean copy                                                                      |
| `pnpm --store-dir <пустой-store> install --frozen-lockfile`    | Успех, 631 downloads, 0 reuse, lockfile неизменен                                                          |
| `pnpm lint`                                                    | Успех                                                                                                      |
| `pnpm format`, `pnpm format:check`                             | Успех                                                                                                      |
| `pnpm typecheck`                                               | Успех для API, Web и generated client                                                                      |
| `pnpm test`                                                    | Успех: 13 PostgreSQL сценариев, Nest HTTP smoke, frontend smoke; node:test также считает родительский test |
| `pnpm build`                                                   | Успех Web и API                                                                                            |
| `pnpm db:generate`, `pnpm db:validate`                         | Prisma client создан, schema валидна                                                                       |
| `prisma migrate diff --from-empty --to-schema ... --script`    | Создан настоящий migration baseline, дополнен SQL constraints                                              |
| `pnpm db:setup`                                                | deploy → runtime permissions → seed успешны                                                                |
| `prisma migrate deploy` на новых тестовых БД и повторно        | Успех, baseline воспроизводим                                                                              |
| seed ×3, concurrent seed, две пустые БД при одной опоре        | Полные dataset snapshots совпадают; concurrency создаёт ровно один набор                                   |
| Ошибка в середине первичного seed                              | Все созданные ранее строки откатились                                                                      |
| Seed после edit/delete                                         | Пользовательское изменение сохранено, удалённая операция не восстановлена                                  |
| Decimal, overflow/NaN, uniques, CHECK, FK, runtime permissions | Реальная PostgreSQL отклоняет недопустимые записи/действия                                                 |
| `pnpm api:generate`, `pnpm api:check`                          | Swagger → Orval воспроизводим                                                                              |
| `docker compose config --quiet`                                | Compose валиден                                                                                            |
| `node scripts/test-docker.mjs`                                 | Web/API builds, empty DB, автоматический seed, HTTP, outage/recovery, repeated startup успешны             |
| `docker compose up -d --wait` на стандартных портах            | Web/API/docs доступны, три сервиса healthy                                                                 |
| `pnpm dev:api`, `pnpm dev:web`                                 | API readiness/docs и Vite UI/proxy HTTP 200; процессы остановлены                                          |
| `pnpm --filter @finora/api start`                              | Собранный API и DB readiness HTTP 200; процесс остановлен                                                  |
| Проверка runtime image                                         | USER node, Nest process не содержит MIGRATION_DATABASE_URL                                                 |
| CI YAML + сравнение package metadata                           | Два корректных jobs; прежние прямые версии и metadata прежних packages не изменены                         |
| `git status`, `git diff --check`, полный diff и source hashes  | Проверены состав изменений и неизменность canonical sources                                                |

В self-review исправлены:

- PostgreSQL считает numeric NaN больше обычных чисел: CHECK положительности явно
  исключает NaN; добавлен реальный отрицательный тест.
- В OpenAPI первоначально заявлялся application/json для ошибки readiness при
  фактическом application/problem+json. Контракт исправлен, Orval regenerated,
  HTTP/Swagger test проверяет совпадение media type.
- Prettier менял автоматически экспортированный JSON. Generated OpenAPI, как
  generated client, исключён из Prettier; воспроизводимость контролирует api:check.
- Bootstrap smoke теперь освобождает fixture даже при ошибке bootstrap.
- Test files запускаются последовательно, чтобы начальная cluster-wide runtime role
  provisioning разных тестовых БД не конкурировала. Сам concurrent seed проверяется
  явным Promise.all и отдельными Prisma clients.
- В demo уточнено разнообразие: личный профиль имеет 6 бюджетов по 3 категориям,
  семейный — 10 бюджетов по 5 категориям. Два audit UPDATE показывают реальное
  изменение суммы/normalized amount и описания в одной DB transaction.

Фактический dataset: 2 users, 16 categories, 288 transactions (120/168), 16 budgets
(6/10), 6 recurring rules, 364 audit entries (326 CREATE, 38 UPDATE). Источники:
204 MANUAL, 48 CSV, 36 RECURRING. При проверенной опоре 2026-09-01 даты:
02.04.2026–26.09.2026, шесть содержательных месяцев. RUB/USD/EUR; правила каждого
профиля — зарплата, аренда, музыкальная подписка. Будущий scheduler не реализован.

Созданы `apps/api/prisma/*`, Prisma/Nest health/infrastructure, startup scripts,
Dockerfiles, Compose, Nginx, `.dockerignore`, `.env.example`, real PostgreSQL tests,
OpenAPI/Orval файлы и workspace acceptance/generation scripts. Обновлены README,
ARCHITECTURE, ROADMAP и данный REPORT. CI дополнен PostgreSQL service и отдельным
Docker acceptance job; remote runner в этой сессии не запускался.
**Remote GitHub Actions: pending verification after commit/push.**

Осознанные компромиссы: три локальных сервиса, публичные HTTP/demo credentials,
привилегированная bootstrap/migration-роль и ограниченная runtime-роль. Prisma CLI
остаётся в production dependency graph для migrate deploy и транзитивно приносит
собственные React/TypeScript/Studio пакеты; это не frontend Finora или новые сервисы.
Предметный каталог валют, validation DTO и transactional domain services относятся
к будущим этапам. Здесь реализованы их schema/constraints и корректные fixtures.
Seed Argon2id использует стабильные соли только для публичных demo-паролей.

Источники технической сверки:
[Prisma 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7),
[Nest Swagger](https://docs.nestjs.com/openapi/introduction),
[npm Prisma 7.10.0](https://registry.npmjs.org/prisma/7.10.0),
[npm Swagger 12.0.1](https://registry.npmjs.org/@nestjs/swagger/12.0.1).

Финальный root pipeline после self-review снова завершился с exit 0 для каждой
команды; последний Docker acceptance также прошёл с тем же dataset hash. Финальные
Git status/diff/check просмотрены: 21 modified, 34 new, 0 deleted files. Canonical
PROJECT/DISCOVERY/AI_RULES побайтно совпадают с HEAD, случайных artifacts и реальных
secrets в Git-visible файлах не обнаружено. Commit/push и изменения Git history
не выполнялись. Все созданные проверочные Compose environments остановлены, их
volumes удалены; dev/start процессы завершены, docker ps не показывает работающих
контейнеров. Stage 2 локально завершён; Stage 3+ не реализован.

Предлагаемый commit: `feat(database): добавить PostgreSQL, Prisma и Docker-инфраструктуру`.

## 14.09.2026 — Stage 3: Design System & App Shell

### Preflight и решения до реализации

Codex desktop; прочитаны все семь канонических документов (обрезанные выводы
дочитаны диапазонами), frontend, workspace, smoke tests, Docker runner и CI.
Рабочее дерево чистое; HEAD `cfa8733` содержит Stage 2. Подагенты не используются.
`rg` отсутствует, инвентаризация выполнена через find/sed. Commit/push запрещены.

Реальный фрагмент запроса: «Это должен быть реальный reusable design system,
а не набор случайно стилизованных компонентов внутри одной страницы».
План: shared tokens/UI → app providers/router/shell → presentation pages →
компонентные и браузерные проверки → полный pipeline и self-review.

Roadmap дополнительно явно включает Query providers, sheets/dialogs и каркас
форм/фильтров. Эти требования сохраняются, хотя в prompt dialog условный.
Dark mode допустим prompt как nice-to-have, но исключён Stage 3 roadmap:
реализуется только полноценная light theme. Продуктового противоречия нет;
канонические PROJECT/DISCOVERY/AI_RULES не меняются.

Проверены официальные npm metadata и документация React Router, Tailwind, Radix.
React Router 8.3.1 совместим с закреплёнными Node 24.21/React 19.3; Tailwind
4.3.3 Vite plugin поддерживает Vite 8. Добавляются только предусмотренные стеком
Router, Query provider, Tailwind, Lucide, точечные Radix Dialog/Slot; большая UI
библиотека и shadcn CLI не нужны. Локальные типизированные primitives следуют
подходу shadcn (код принадлежит проекту, сложная доступность — Radix).
Motion/Recharts/RHF/Zod отложены до реальной потребности. Для поведения нужны
user-event и Playwright; axe используется только в браузерных тестах.
Lucide выбран 1.41.0 от 04.09, вместо выпущенного сегодня latest, без исключения
release-age policy. Ни одна прежняя прямая dependency не обновляется.

Результаты реализации и проверок будут записаны после их фактического выполнения.

### Реализованная архитектура и визуальная система

`shared/styles/tokens.css` — единый источник CSS custom properties и Tailwind
semantic utilities (`@theme static`). Полная светлая палитра: surfaces, border
и отдельный контрастный input-border, indigo primary/hover/active, semantic
success/income, danger/expense, warning, focus и disabled, текстовые уровни.
Системный sans-serif с кириллицей не требует загрузки; финансовый стиль имеет
табличные цифры, spacing — кратность 4px, radius 6/8/12px, две сдержанные тени,
border 1px, focus 2px/offset 3px. Durations 150/200/250ms, skeleton pulse 1500ms;
reduced motion отключает анимации и transitions. Light задан на html до mount,
нативные controls согласованы через color-scheme. Dark mode не реализован.

`shared/ui` содержит типизированные Button/ButtonLink/IconButton, Card, Badge,
Divider, PageContainer/PageHeader/Section, Input/Select/FilterBar, Sheet и
LoadingState/Skeleton/EmptyState/ErrorState. Есть native props/ref, button default
не submit, настоящие ссылки, labels, hint/error associations, aria-invalid,
optional presentation actions. ErrorState не принимает Error/stack trace;
передавать в description можно только безопасный текст. Нет forms domain logic.
Sheet — локальный responsive компонент на Radix Dialog, с portal, scroll lock,
focus trap, Escape, доступными title/description и возвратом фокуса.

`app` владеет Query provider, брендом, navigation config и AppShell. QueryClient
создаётся отдельно на mount, запросы не выполняются. React Router/Outlet задаёт
общий layout; routes и placeholder titles соответствуют Discovery. `/transactions/import`
не содержит wizard; текущим родителем остаются транзакции. «Ещё» открывает четыре
вторичных раздела, при выборе focus переходит в новый main; при отмене возвращается
на trigger. Есть skip link, document.title и сброс scroll при смене pathname.

`pages` компонуют честный обзор предварительной версии, placeholders и 404.
Нет фиктивных KPI/графиков/балансов или чтения seed. DEV-only `/design-system`
показывает работающие примеры primitives/feedback/полей и состояний; production
не содержит этот route, ссылку и JavaScript витрины. Это developer surface, не
новый продуктовый раздел. Shared не импортирует pages/app. Пустые features/entities
и новый monorepo UI package не создавались без реального предметного кода/потребителя.
Подробные правила, API композиции и ограничения описаны в `apps/web/README.md`.

### Responsive, accessibility и визуальная проверка

Единые breakpoints: 48/64/90rem. Tablet sidebar 224px с переносом длинных названий,
desktop 248px; максимальный content 1200px, gutters 16/32/40px. Mobile имеет свой
верхний бренд и четыре bottom navigation items. Bottom navigation sticky, остаётся
в потоке и резервирует фактическую высоту, включая выросшие labels/safe area.
Sheet снизу на mobile и справа на tablet/desktop, ограничен dvh, body прокручивается.
Touch targets от 44px, видимые hover/active/focus/disabled, цвет дублируется текстом
и активным маркером. Scroll padding сохраняет видимость клавиатурного фокуса.

Использован навык Browser и встроенный браузер Codex: фактически открыты и визуально
просмотрены desktop 1440×960, tablet 768×1024, mobile 390×844, мобильная панель «Ещё»,
витрина состояний и production preview. Проверены spacing, типографика, выравнивание,
переносы, active state, navigation и scroll. Browser screenshot сразу после scroll
один раз захватил ещё не перерисованный кадр; свежий screenshot показал реальные
состояния, DOM/геометрия подтверждали содержимое. Это не объявлялось дефектом UI.

Playwright дополнительно проверяет 320×740, 390×844, 640×320, 767×900,
768×1024, 1024×768, 1440×960 и 1920×1080. На каждом размере проверены обзор,
длинное название регулярных операций, CSV deep link и витрина. Проверяются
horizontal overflow, отсутствие обрезки навигации, touch target geometry,
нижний footer и keyboard focus. Отдельно проверен root font 200% с очень длинным
денежным примером/вводом, reduced motion и native Select.

Axe WCAG 2/2.1/2.2 A/AA: ноль violations на обзоре, placeholder, витрине и открытом
dialog в 390px и 1440px. Дополнительно реальные keyboard проверки: Tab/Shift+Tab,
Enter, skip link, visible focus, trap, Escape, возврат trigger, focus после route
change и browser back. Это проверенная accessibility foundation, не заявление
о сертификации: физические iOS/Android и screen reader (VoiceOver/NVDA) отдельно
не тестировались; финансовые графики/формы ещё отсутствуют.

### Найденные проблемы и исправления

- Первый build выявил коллизию `navigation.ts`/`Navigation.tsx` при resolution на
  case-insensitive macOS. Конфигурация переименована в `navigation-config.ts`.
- Первый dev listen получил sandbox EPERM; тот же Vite запущен с разрешением
  loopback listen. Настройки приложения/безопасности не ослаблялись. Вкладка с
  прежней ошибкой соединения заменена новой после подтверждения HTTP 200.
- Lint обнаружил неявный any callback тестовой формы: задан тип React SubmitEvent,
  отключений правила/strict не добавлялось.
- Начальный фиксированный расчёт нижнего padding не учитывал полную высоту nav.
  После browser geometry проверки bottom navigation переведена в sticky flow.
  Остаточная разница 0.375px в footer test — дробное округление scroll position;
  допуск 1 CSS px документирован в тесте, видимость самих действий проверяется
  отдельно без допуска перекрытия.
- При 200% шрифта верхний бренд с badge не переносились, а мобильные labels
  наезжали друг на друга. Добавлены flex-wrap и переносы длинного текста, nav
  имеет естественную высоту; тест воспроизводит именно увеличенный шрифт.
- Axe поймал недостаточный contrast во время fade-in текста панели. У Sheet
  удалена анимация opacity; остаётся короткое перемещение полностью непрозрачной
  поверхности. Контраст стабилен во время открытия, тест не прячет проблему
  искусственной задержкой или отключением правила.
- При отдельном self-review добавлен scroll padding для видимости keyboard focus
  над bottom navigation, а также браузерная регрессия этого сценария.
- Убраны неиспользуемые hintId/errorId и имя незагружаемого Inter из font stack.
  Проверены размеры компонентов, отсутствие domain imports, magic colors вне
  tokens (только статический brand favicon/meta), ненужных API и зависимостей.

### Зависимости и footprint

Новые runtime packages: react-router 8.3.1, @tanstack/react-query 5.102.8,
@radix-ui/react-dialog 1.1.23, @radix-ui/react-slot 1.3.3, lucide-react 1.41.0.
Dev: tailwindcss/@tailwindcss/vite 4.3.3, @testing-library/user-event 14.6.7,
@playwright/test 1.63.0, @axe-core/playwright 4.13.0. Они реально используются.
Прежние direct dependencies/engines не обновлены; pnpm-workspace policies неизменны.
Установка Lucide пережила один DNS retry, завершилась успешно. Проверка peer
совместимости не потребовала исключений. Frozen install успешен, lockfile стабилен.
Production JS около 334.32 kB (105.79 kB gzip), CSS 33.23 kB (6.13 kB gzip).
Lucide tree-shaken, dev-витрина исключена. Remote font/API/CDN для UI не нужны.

### Выполненные проверки

| Проверка                         | Результат                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Успех; lockfile актуален, версии закреплены                                                                                                       |
| `pnpm lint`                      | Успех, zero warnings, без suppressions                                                                                                            |
| `pnpm format:check`              | Успех; canonical sources исключены из форматирования                                                                                              |
| `pnpm typecheck`                 | Успех Web, API и api-client; strict и skipLibCheck:false сохранены                                                                                |
| `pnpm test`                      | Успех: 19 frontend tests, Nest HTTP smoke и 13 PostgreSQL scenarios; node:test также считает родительский test, итого сообщает 15                 |
| `pnpm test:e2e`                  | Успех: responsive, keyboard, focus, states/fields, axe, reduced motion и reflow                                                                   |
| `pnpm build`                     | Production Web и Nest API собраны                                                                                                                 |
| `pnpm db:validate`               | Prisma schema валидна                                                                                                                             |
| `pnpm api:check`                 | OpenAPI export и Orval generation воспроизводимы, generated файлы не изменены                                                                     |
| `pnpm test:docker`               | Полная штатная clean-source приёмка успешна: оба образа, 3 healthy services, HTTP/deep links/Swagger, seed ×3, outage/recovery, down/up и cleanup |
| Browser verification             | Реальный dev UI, desktop/tablet/mobile, Sheet, states; production `/design-system` показывает 404 и не имеет ссылки на витрину                    |

Полная Docker приёмка сохранила hash dataset Stage 2:
`55c7d9a51be58a2b6d685feb3d3057333c2dfd7fe6be729cbce3bf436a4c89b0`.
Тесты работают на отдельной настоящей PostgreSQL; demo-БД не очищается.
CI сохранён и расширен установкой Chromium/Playwright UI smoke в foundation job;
Docker acceptance job, инфраструктурные scripts и API contracts не менялись.
Remote GitHub Actions не запускался: commit/push запрещены пользователем.

### Scope и ограничения

Stage 3 завершён локально. Не реализованы Stage 4+, auth/guards, предметный CRUD,
бюджеты/аналитика, scheduler, CSV workflow и audit UI. Backend, Prisma schema,
migrations, seed, Dockerfiles/Compose/Nginx и generated client не редактировались.
PROJECT.md, DISCOVERY.md, AI_RULES.md сохраняются побайтно. Изменены только frontend,
его зависимости/проверки и документация фактического состояния. No-op будущие
кнопки/фиктивные финансовые данные отсутствуют. Light завершена, dark отложен
согласно каноническому Stage 3; отдельного UI settings functionality нет.

Источники сверки:
[React Router declarative](https://reactrouter.com/start/declarative/installation),
[Tailwind Vite](https://tailwindcss.com/docs/installation/using-vite),
[Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog),
[официальный npm registry](https://registry.npmjs.org/).

Предлагаемый commit: `feat(ui): создать дизайн-систему и адаптивную оболочку Finora`.
Commit/push и операции с Git history не выполнялись.

Финальная проверка после self-review: 15 Playwright tests passed (8.1s), lint,
format:check, typecheck и build снова exit 0. Дополнительно выполнен Docker web
build с окончательным CSS — exit 0. Source integrity подтверждает побайтную
неизменность трёх canonical sources, прежних dependency versions, backend,
инфраструктуры и generated contracts. Git diff/check просмотрены: 16 изменённых
и 24 новых файла; build/test artifacts игнорируются. Временный PostgreSQL project
остановлен и удалён вместе со своим volume; dev/preview процессы остановлены.
Ограничение осталось только для remote CI и не проведённых проверок на физических
устройствах/screen reader; обязательные локальные проверки Stage 3 пройдены.

## 2026-09-14 — исправление Docker acceptance в CI Stage 3

Инструмент: Codex; использован навык diagnosing-bugs, без субагентов.
Задача ограничена падением acceptance после остановки PostgreSQL. Stage 4 не начат.

Корневая причина — `compose('start', '--wait', 'postgres')` в
`scripts/test-docker.mjs` (строка 129 до исправления). Локальный Compose v5.2.0
поддерживает этот флаг, а Compose v2.38.2 возвращает `unknown flag: --wait`.
Версия v2.38.2 сверена с опубликованным
[составом Ubuntu 24.04 runner](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md).
Официальный бинарник этой версии установлен только во временный каталог;
штатная установка Docker не изменена. На нём воспроизведены как минимальный
вызов, так и падение полного исходного acceptance на той же команде.
Readiness 503 и Prisma-ошибка после остановки БД — ожидаемая часть сценария.

Восстановление теперь выполняет совместимый `docker compose start postgres`,
получает ID контейнера через `compose ps -q postgres` и опрашивает
`docker inspect --format '{{.State.Health.Status}}'` до `healthy`. Это реальный
healthcheck `pg_isready` из Compose. Затем HTTP-опрос ожидает строго 200 от
`/health/ready` до последующей общей проверки стека. Для каждого ожидания задан
отдельный deadline 180 секунд через AbortSignal; отдельный inspect/HTTP-запрос
ограничен 5 секундами. Интервал повторной проверки — 1 секунда только после
неуспешного состояния, без фиксированного ожидания запуска. При ошибке выводятся
название проверки, последнее состояние и причина, затем штатные логи и cleanup.

Все прежние assertions сохранены: healthy/readiness 200 → PostgreSQL stopped /
readiness 503 (liveness 200) → PostgreSQL healthy / readiness 200; seed ×3,
288 транзакций, hash всех таблиц, HTTP/Swagger, down/up с сохранённым volume.
Остальные вызовы Compose проверены по help v2.38.2 и реальным прогонам:
`up -d --wait --wait-timeout`, `ps --format json`, `exec -T`, `logs --no-color`,
`down -v --remove-orphans`, `port`, `stop`. Других несовместимых флагов не найдено.

`.github/workflows/ci.yml` проверен: docker job использует `ubuntu-latest`,
Node.js из `.nvmrc` и непосредственно `node scripts/test-docker.mjs`, без pnpm
на хосте. Новые проверки используют только встроенные Node API и Docker CLI;
изменение workflow и установка новой версии Compose в CI не требуются.

Локальные проверки выполнены на Node.js 24.21.0, pnpm 12.4.1 и отдельной
PostgreSQL `17.6-bookworm`, с `CI=true` для foundation suite:

- `pnpm install --frozen-lockfile` — успешно, включая генерацию Prisma client;
  первый sandbox-запуск не имел DNS-доступа, повтор с разрешённой сетью успешен.
- `pnpm db:validate`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck` — успешно.
- `pnpm test` — 19 frontend tests; Nest HTTP smoke и 13 PostgreSQL scenarios
  (node:test сообщает 15 passed, включая родительский тест), без skips/failures.
- `pnpm build` — успешно, Web и API собраны.
- Установка Chromium командой из workflow с `--with-deps` — успешно;
  `pnpm test:e2e` — 15 passed, без повторов.
- `pnpm api:check` — успешно, OpenAPI и generated client воспроизводимы.
- Полный `node scripts/test-docker.mjs` — два независимых успешных прогона на
  Compose v2.38.2 и один на штатном v5.2.0, включая сборки из чистой копии.
  Во всех трёх сохранён SHA-256
  `55c7d9a51be58a2b6d685feb3d3057333c2dfd7fe6be729cbce3bf436a4c89b0`.
- Отдельная временная проверка реальной функции ожидания: переход
  `starting → healthy` успешен; постоянный `unhealthy` завершается ожидаемой
  ошибкой с последним состоянием через 180008 мс, без подмены времени.
- Итоговые `pnpm format:check` и `git diff --check` — успешно.

Созданные тестовые контейнеры, сети и volumes удалены. Изменены только acceptance
runner и этот отчёт по правилам ведения истории проекта. Workflow, lockfile,
PROJECT.md, DISCOVERY.md и AI_RULES.md не изменены. Remote GitHub Actions с этим
исправлением не запускался: commit и push запрещены пользователем.

Предлагаемый commit: `fix(ci): исправить восстановление PostgreSQL в acceptance`.

## 2026-09-14 — Stage 4: Authentication & User Isolation

Использован Codex desktop, shell и Browser skill для визуальной проверки.
Субагенты не использовались. Задача выполнена в исходном рабочем дереве `main`,
которое до начала было чистым. По сообщению пользователя исходный main зелёный
после отдельного CI-fix; новый remote-run не выполнялся, commit/push запрещены.

Фрагмент реального prompt:

> Теперь необходимо выполнить ТОЛЬКО Stage 4 согласно зафиксированному roadmap проекта.
> Не ослабляй существующие тесты, CI, accessibility и acceptance checks.

Prompt задал проверяемую границу: auth, профиль и изоляция; финансовые placeholders
не превращались в CRUD/dashboard. Перед кодом изучены AI_RULES, PROJECT, DISCOVERY,
ROADMAP, ARCHITECTURE, README, REPORT, frontend README и фактическая реализация
schema/constraints/seed, health/Swagger/Orval, shell/providers/primitives и CI.
Утилита rg недоступна, использованы find/sed/grep. Старые фразы «auth ещё нет»
оказались описанием предыдущего этапа, а не архитектурным запретом; блокирующих
противоречий источников не обнаружено.

### Аудит и реализация

Stage 1–3 подготовили User/Category/AuditEntry, lower(email) unique index, составные
ownership FK, runtime permissions для audit, deterministic demo hashes, Orval,
Query provider и UI primitives. Новая schema/migration не нужна: baseline и все
DB constraints неизменны. Из seed вынесен только каталог стандартных категорий для
повторного использования; re-export сохраняет прежний API и dataset.

AuthModule/UsersModule встроены в NestJS. Global AuthGuard закрывает обработчики
по умолчанию, Public отмечает точные исключения; user берётся из проверенной
JWT-cookie и реальной записи БД. Register создаёт пользователя, 8 категорий и
8 category CREATE snapshots в общей транзакции. AuditWriter не открывает свою
транзакцию. Ошибка после нескольких audit writes откатывает все изменения.
Email нормализуется trim/lowercase; concurrent duplicate переводится из P2002 в
безопасный 409. Профиль возвращает только разрешённые поля без password/hash.

Argon2id через async Node crypto: memory 65536 KiB, passes 3, parallelism 1,
32-byte hash, случайная 16-byte соль; существующие seed hashes совместимы.
Несуществующий email проверяется с dummy hash той же стоимости, ошибка login
одинакова для неизвестного email и неверного пароля.
JWT через jose: HS256, issuer finora, audience finora-web, обязательные sub/iat/exp,
TTL 86400 секунд. Cookie finora_session — HttpOnly, SameSite=Strict, Path=/,
без Domain. Secure включён по умолчанию API; локальный HTTP Compose явно задаёт
false. AUTH_SECRET обязателен от 32 байт, demo default опубликован только как
локальный. Logout удаляет cookie с теми же атрибутами, в том числе после expiry;
скопированный ранее JWT действует до exp, revoke/refresh/session table не добавлены.

Origin точный и обязательный для всех mutations, включая login/register/logout.
CORS credentials только для allowlist. Nginx заменяет X-Forwarded-For, API не имеет
публичного порта; trust proxy включён только для этой топологии. Login ограничен
10 запросами/60 секунд/IP, register 5/час/IP, ответы 429 включают Retry-After.
Limiter локальный, до 10 000 активных buckets, очищает истёкшие; restart его сбрасывает.
Лимит привязан к metadata обработчика, а не написанию URL. JSON body ≤16 KiB.
Zod boundary отклоняет неизвестные/служебные поля, invalid types, currency/timezone,
некорректный email и длины. ProblemFilter сохраняет единый русский контракт для
400/401/403/404/409/413/429/500, parser errors не раскрывают тело запроса. Trace ID и
no-store устанавливаются до JSON parser; прежняя redaction внутренних ошибок сохранена.

UsersService меняет только displayName/baseCurrency/timeZone текущего владельца.
Смена валюты использует FOR UPDATE пользователя и EXISTS по transactions, budgets,
recurring rules (включая archived) и финансовому audit удалённых данных.
Проверены маленькая и предельная Decimal fixture без преобразования в float.
Категории не блокируют смену валюты. Timezone меняется без сдвига business dates.
Будущие financial writers обязаны брать ту же блокировку пользователя; Stage 5
не реализован. Профиль не принимает чужие ID/связи или themePreference.

Swagger/OpenAPI экспортирует 7 auth/settings операций, DTO, ограничения,
additionalProperties:false входных объектов, cookie security и Problem responses.
Orval client регенерирован штатно, api:check воспроизводим. Frontend использует
только тонкий typed adapter над generated Fetch functions, без ручных URL/fetch.
Новые exact dependencies: jose 6.2.12, zod 4.6.4, react-hook-form 7.88.0,
@types/express 5.0.6; web подключает workspace api-client. Прежние direct versions
не обновлены. Первый npm download упёрся в sandbox DNS, разрешённый повтор успешен.
Web Dockerfile теперь копирует source api-client, необходимый реальному потребителю.

### Frontend, состояния и доступность

Публичные login/register, auth boundary для product routes, реальные demo-кнопки,
logout и settings используют Stage 3 Card/Input/Select/Button/states/tokens.
React Hook Form + Zod проверяют поля до отправки, server field errors отображаются
с label/aria-describedby/aria-invalid. Каталоги валют и IANA timezone читаются через
Query из ICU закреплённого Node, без внешнего API; при ошибке есть retry и submit
заблокирован. User state приходит через auth/me, mutations не повторяются автоматически.

Обработаны initial loading, anonymous, initial error/retry, background loading/error
с сохранением черновика, validation, pending, server conflict, success и 401/expiry.
Пустые обязательные поля получают validation; отдельного пустого финансового списка
Stage 4 не требует, overview остаётся честным предварительным экраном.
При logout/смене владельца запросы отменяются, пользовательские queries/mutations
удаляются, значение текущей сессии заменяется с сохранением observer. Pending
профиля блокирует logout; поздний ответ прежнего пользователя не меняет новую сессию.

Проверены 320/390/768/1440/1920px и 640×320 landscape для новых форм; прежний suite
дополнительно сохраняет 767/1024px. Длинные имя/email и 200% root font не создают
horizontal overflow. Нативные Select доступны на mobile, функциональность не скрыта.
Keyboard login, focus первого ошибочного поля, focus main после auth и visible focus
проверены браузером. Прежние Sheet trap/Escape/возврат focus, skip link, responsive
navigation, safe-area и reduced motion сохранены. Axe WCAG 2/2.1/2.2 A/AA — ноль
violations во всех проверенных состояниях. Физические устройства и screen reader
отдельно не тестировались.

Через Browser просмотрены реальный login desktop, register 320px и settings
1440/390px с demo-профилем. Консоль вкладки не содержит warning/error. Full-page
снимок Browser один раз показывал промежуточную сжатую геометрию после viewport
change; фактическая DOM geometry и стабильный viewport screenshot подтвердили
корректный layout. Дополнительное доказательство — реальный Chromium reflow suite.
Временная вкладка закрыта, viewport override сброшен.

### Self-review и исправления

- Clear всего QueryClient разрывал observer сессии: теперь очищаются все остальные
  queries/mutations, а сама сессия заменяется атомарно; добавлена регрессия logout/login.
- Конкурирующие imperative navigate и Navigate убирали success notice/focus после
  auth: оставлен один декларативный переход, Playwright проверяет focus main.
- Validation focus срабатывал до снятия disabled: hook переводит его после pending
  в первое ошибочное поле по DOM-порядку, включая серверные field errors.
- Сравнение точного path в limiter допускало обход trailing slash/case: заменено
  metadata и проверено HTTP aliases плюс spoofed X-Forwarded-For через Nginx.
- У web Docker build не было нового api-client source: добавлен необходимый COPY.
- Фоновая ошибка auth/me теряла черновик: сохраняются форма и cached user с retry;
  401 отдельно очищает сессию. Pending save/logout и поздний ответ другого владельца
  проверены отдельной компонентной регрессией.
- Визуальная проверка выявила отсутствие внутренних отступов новой profile Card:
  добавлены token spacing и существующая typography utility.
- Уточнены русские сообщения Zod для invalid types, additionalProperties OpenAPI,
  запрещены control characters в имени, trace/no-store перенесены перед body parser.

Отдельно просмотрены diff и новые модули на scope creep, дубли primitives/API,
unsafe casts/any, monetary/date arithmetic, N+1, race/cache, ownership и секреты.
Финансового CRUD, лишних API, mock production data и debug-панелей не добавлено.

### Финальные проверки

Локальная среда: Node 24.21.0, pnpm 12.4.1, macOS; PostgreSQL 17.6 в отдельном
контейнере. Foundation команды выполнены с CI=true, Linux runtime проверен Docker.

| Проверка                                | Результат                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| pnpm install --frozen-lockfile          | Успех, exact lockfile актуален                                                                                |
| pnpm db:validate                        | Успех, schema неизменна                                                                                       |
| pnpm lint                               | Успех, zero warnings                                                                                          |
| pnpm format:check                       | Успех                                                                                                         |
| pnpm typecheck                          | Успех, все 3 packages, strict сохранён                                                                        |
| pnpm test: frontend                     | 31 passed: 19 прежних + 12 новых                                                                              |
| pnpm test: backend                      | 29 passed по node:test: 13 новых auth + 13 прежних PostgreSQL + HTTP smoke + 2 parent tests; 0 skipped/failed |
| pnpm build                              | Nest и production Web собраны; JS 480.33 kB / gzip 149.86 kB, CSS 34.44 kB                                    |
| playwright install --with-deps chromium | Успех, команда из CI                                                                                          |
| pnpm test:e2e                           | 15 passed, прежние assertions сохранены                                                                       |
| pnpm api:check                          | Успех, OpenAPI/Orval воспроизводимы                                                                           |
| pnpm test:e2e:auth                      | Успех: полный Docker acceptance + 11 passed через production Nginx, без retries                               |
| git diff --check                        | Успех                                                                                                         |

13 новых backend scenarios покрывают register/categories/audit/me, random Argon2 salts,
concurrent email, rollback audit, seed login/generic errors, malformed/expired/wrong JWT,
Origin/CORS, payload limits/validation, ownership, currency fixtures, concurrent DB lock,
rate limits/aliases и logout/Secure. 12 новых frontend tests покрывают состояния форм,
cache, pending, validation, retry, profile updates, expiry и late-response race.
11 новых E2E включают registration/profile/reload/logout/login, demo isolation,
ошибки сети/пароля/сессии, 6 responsive/axe вариантов, keyboard/pending и Nginx security.
До финального Nginx прогона 10 auth E2E отдельно прошли на dev API для диагностики;
они не выдаются за Compose acceptance.

Docker mode --browser сначала выполнил все прежние assertions: чистая копия без
node_modules/.env, оба builds, 3 healthy services, Swagger/deep links, 288 transactions,
seed ×3, hash всех таблиц, PostgreSQL outage и readiness 200 → 503 → 200 при liveness 200,
down/up с тем же volume. Hash до изменяющих browser tests остался
55c7d9a51be58a2b6d685feb3d3057333c2dfd7fe6be729cbce3bf436a4c89b0.
Затем прошли 11 auth tests; finally удалил своё окружение и volume.
Обычный Docker runner без --browser не требует host pnpm, как и прежде.
CI foundation получил дополнительную browser Compose проверку; timeout увеличен
с 20 до 25 минут под дополнительный build, ни одна проверка не удалена/ослаблена.

Stage 4 полностью завершён локально, Stage 5 не начинался. Не реализованы financial
CRUD, analytics/dashboard, budgets UI, recurring scheduler, CSV, audit reader/UI,
roles/admin, shared workspace, refresh/reset/verification и dark mode.
Обновлены ROADMAP, REPORT, README, ARCHITECTURE и apps/web/README.
PROJECT, DISCOVERY, AI_RULES, Prisma schema и baseline сохранены без изменений.
Commit/push, force и history rewrite не выполнялись.

Предлагаемый commit: feat(auth): добавить авторизацию и изоляцию пользователей Finora
