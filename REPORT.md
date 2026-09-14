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

## 2026-09-14 — Stage 5: Categories & Transactions Core

Работа выполняется Codex desktop в исходном рабочем дереве, без subagents,
commit/push и изменения Git history. Исходное дерево было чистым. Источники
и реализация Stage 1–4 сопоставлены с Stage 5 ROADMAP: категории, операции,
валютные snapshots, поиск/фильтры/сортировки, pagination 10/25/50, responsive
формы и атомарный audit. Stage 6 не начат.

Реальный фрагмент prompt: «Backend API является source of truth» и
«Если хотя бы один обязательный пункт не выполнен — НЕ называй Stage 5 завершённым».
Итоговые результаты приёмки записаны в конце этой секции.

Первый цикл: schema/migration и rich seed уже покрывают этап, поэтому не изменены.
Добавлены CategoriesModule и TransactionsModule с общей блокировкой владельца,
согласованной с UsersService. Эта блокировка сериализует собственные финансовые
записи, изменения категорий и baseCurrency; разные владельцы независимы.
Новые category duplicates проверяются case-insensitive по имени и типу под той же
блокировкой, включая архивные категории. Составные ownership FK сохранены.

Чистые money/date helpers валидируют decimal strings и календарные даты.
Клон Decimal с precision 60 сохраняет произведение до единственного HALF_UP
округления к точности основной валюты из локального ICU. Исходная сумма также
проверяется по точности валюты. Допустимо округление очень маленького положительного
пересчёта к нулю; исходные amount/rate обязаны быть положительными. Точность хранения
и прежние ограничения NUMERIC не менялись. Описание обязательно, trim, 1–500 символов;
название категории trim, 1–100, type/icon/color проверяются сервером.

Новые PostgreSQL сценарии прошли в первом прогоне; прежний smoke ожидал 404 от
ещё не существовавшего /transactions. Проверка неизвестного маршрута сохранена
на /unknown, для /transactions добавлен 401. Это изменение контракта этапа,
а не ослабление проверки. Аналогично расширен Compose runner.

При компонентной проверке обнаружены и исправлены загрузка CSS tokens через
единый stylesheet, потеря focus при debounce remount и пересоздание query уходящим
observer после expiry. Последняя исправлена минимально в AuthProvider, с сохранением
Stage 4 session observer. После исправления 44 frontend tests прошли.
Первая frozen установка блокировалась DNS sandbox; сетевой повтор фиксируется
отдельно по результату. Зависимости и lockfile не меняются.

Дополнительные проверки настоящего браузера нашли потерю открытого диалога при
обновлении отфильтрованной строки. Диалог вынесен на уровень страницы, восстановление
фокуса учитывает исчезнувший trigger; добавлен regression test. Исправлены также
ожидание окончания isSubmitting перед focus и отмена публичного справочника валют
при гостевой сессии (отдельный компонентный regression). Skip link сохраняется
при переходе из загрузки session в authenticated shell.

Проверка 200% текста на 320px выявила два дефекта общих primitives: заголовок Sheet
вытеснял её body из доступной прокрутки, а контейнер действия PageHeader мог быть
шире страницы. Панель теперь прокручивается целиком, padding ограничен шириной;
контейнер действия ограничен max-width. Диагностическая проверка геометрии показывает
конкретные выходящие за viewport элементы, строгий no-overflow assertion сохранён.

Один повтор Compose/shell был испорчен ошибкой процесса проверки: две одновременно
запущенные Playwright-команды очищали общий test-results и получали ENOENT traces.
Это не скрыто как PASS; последующие browser suites выполняются последовательно.
Отдельный Docker job прошёл полностью: clean/repeated startup, seed ×3, DB recovery,
Stage 5 CRUD/isolation/archive, seed после мутаций, API restart и сохранность
edited/deleted state. Baseline SHA-256:
`55c7d9a51be58a2b6d685feb3d3057333c2dfd7fe6be729cbce3bf436a4c89b0`.

Таблетный reflow дополнительно потребовал переноса длинных labels и выбора
колонок/мобильного фильтра по доступной ширине контейнера. Category grid также
учитывает фактическое пространство при увеличенном шрифте. Временный диагностический
E2E удалён после проверки 320/390/768/1440/1920/640×320; основные Compose assertions
сохранены. Неверное ожидание в новом E2E (переход на login до завершения logout)
исправлено добавлением проверки фактического /login после каждого выхода.

### Отдельный self-review после первого зелёного Compose прогона

Первый полный успешный browser acceptance: 18/18; foundation: backend 41/41,
frontend 46/46, Prisma/lint/format/typecheck/build/api:check PASS. После этого
проведён отдельный review HTTP boundaries, ownership predicates, Decimal/date,
user row lock, атомарности audit, cache keys/expiry, query bounds, форм и CSS.

Найденные и исправленные проблемы:

- `Prisma insensitive equals` использует ILIKE: имя `%` ошибочно конфликтовало
  с любым существующим именем. Новый PostgreSQL regression воспроизвёл 409 вместо 201. Теперь `%`, `_` и обратный слеш экранируются в параметре; literal names и
  реальные case-insensitive duplicates проверены. SQL остаётся параметризованным.
- Создание из EmptyState ещё имело отдельную обёртку диалога и теряло возврат
  фокуса при исчезновении trigger после фонового появления записи. Regression
  воспроизвёл focus на body вместо main. Все create/edit/delete теперь принадлежат
  одной странице; лишние Editor wrappers удалены, оставлены CategoryForm и
  TransactionForm. Черновик и fallback focus проверены.
- Success после удаления категории был неточным («удалена или перенесена»).
  Mutation hook передаёт подтверждённый результат, UI сообщает конкретный outcome;
  компонентный test проверяет архивирование.

Повтор после исправлений: backend **42/42** (включая родительские node:test),
frontend **47/47**, typecheck/lint/build/api:check PASS. Нет новых dependencies,
`any`, подавлений TypeScript/lint, TODO вместо Stage 5 поведения или параллельного
handwritten финансового клиента. Списки ограничены 10/25/50 и имеют единый snapshot
items/count; отдельный собственный компактный categories/options предназначен
для выбора связи, без загрузки всей финансовой истории. Архивирование связанных
правил выполняется в той же transaction; scheduler не добавлялся.

### Контракты, данные и границы этапа

API: GET/POST categories и transactions; GET/PATCH/DELETE по ID;
GET categories/options. Owner берётся только из auth context. DTO строгие,
неизвестные поля отвергаются; все существующие guards, cookies, Origin, CORS,
rate limits и Problem Details сохранены (CORS дополнен DELETE). Чужой ID и
отсутствующий ID неразличимы по domain response; чужая category relation не
связывается ни при create, ни при patch. Ответы и audit snapshots содержат
явно разрешённые поля, деньги сериализуются строками.

Frontend: реальные /categories и /transactions, Sheet forms/confirmations,
loading/empty/error/retry/success/pending, URL filters и server pagination.
Сортировки и amount range используют amountInBaseCurrency. Поиск буквальный,
без регистра, по description/category. Query keys включают userId, AbortSignal
передаётся generated client, поздний 401 прежней сессии не сбрасывает нового
владельца. Mutation не повторяется автоматически, двойной click не создаёт дубль.

Prisma schema, применённые migrations, runtime permissions и seed не менялись:
16 categories, 288 transactions, 16 budgets, 6 recurring rules, 364 audit entries,
два изолированных demo-пользователя, шесть месяцев и RUB/USD/EUR уже достаточны
для Stage 5. Seed остаётся одноразовым атомарным, повтор не перезаписывает edits
и не восстанавливает deletes. Косметические migrations не создавались.

Stage 6+ остаются будущими: budgets API/UI, Dashboard/Insights aggregation,
recurring execution/scheduler, CSV, audit reader/UI, dark mode. Фактических
расхождений scope с ROADMAP не найдено; развитие seed реализовано проверкой
уже достаточного rich dataset без изменения его данных.

### Ограничения проверки

Проверки браузера выполнены в Chromium на macOS через production Compose/Nginx,
а не на физических телефонах и не с настоящим screen reader. Axe WCAG 2/2.1/2.2 AA,
keyboard/focus, reduced motion, длинные названия/описания/суммы и 200% font reflow
проверяются автоматически. Встроенный браузер дополнительно использован для
визуальной проверки desktop/mobile списка, категорий, формы и mobile filters.

Vite предупреждает о JS chunk чуть больше 500 kB до gzip; сборка успешна,
лимит предупреждения не увеличен. Произвольные вручную повторённые POST операций
не имеют нового idempotency contract: одинаковые реальные операции допустимы;
UI защищён от двойного нажатия и автоматических retry. Прежний stateless logout
очищает cookie, но скопированный JWT остаётся валиден до TTL. Remote GitHub Actions
для Stage 5 не запускался: commit/push запрещены; remote Stage 4 — прежняя стабильная
точка, указанная пользователем. Новая проверка — локальный прогон команд CI на macOS.

### Итоговая приёмка Stage 5 — completed

Все обязательные quality gates выполнены. После self-review повторно пройдены
затронутые проверки; browser команды выполнялись последовательно, без конфликта
артефактов. Финальный shell: **15/15**, без retries; финальный Compose browser:
**18/18**, без retries (11 существующих auth + 7 новых finance), 23,3 с браузерной
части. Backend **42/42**, frontend **47/47**; новых Stage 5 backend tests по счётчику
node:test — 13 (в том числе родительский), новых frontend tests — 16.

| Проверка реального CI                                              | Результат                                           |
| ------------------------------------------------------------------ | --------------------------------------------------- |
| Node 24.21.0 / pnpm 12.4.1; frozen install и Prisma generate       | PASS; сетевой повтор после sandbox DNS успешен      |
| pnpm db:validate                                                   | PASS                                                |
| Migrate deploy на пустой БД и повторно; constraints/runtime grants | PASS в PostgreSQL tests и Docker                    |
| pnpm lint                                                          | PASS, без подавлений                                |
| pnpm format:check                                                  | PASS                                                |
| pnpm typecheck                                                     | PASS                                                |
| pnpm test (backend/frontend)                                       | PASS, итог 42 / 47                                  |
| pnpm build                                                         | PASS; предупреждение Vite о chunk >500 kB сохранено |
| Playwright install --with-deps chromium                            | PASS                                                |
| pnpm test:e2e                                                      | PASS, 15 shell                                      |
| pnpm api:generate / pnpm api:check                                 | PASS, Swagger/Orval воспроизводимы                  |
| pnpm test:e2e:auth                                                 | PASS, 18 browser + полный Compose acceptance        |
| pnpm test:docker (отдельный Docker job)                            | PASS                                                |
| git diff --check                                                   | PASS                                                |

Docker доказывает clean copy без node_modules/.env, clean/repeated startup,
healthy PostgreSQL/API/Nginx, migrate deploy, seed ×3 без изменения baseline,
readiness **200 → 503 → 200** и liveness при DB outage. Расширенная проверка после
реальных Stage 5 mutations доказывает изоляцию, category archive, повторный seed,
API restart и сохранность create/edit/delete. Временные acceptance volumes
удалены runner в finally; дополнительная тестовая PostgreSQL и dev-серверы
остановлены/удалены. Пользовательские данные не использовались для тестовых мутаций.

Изменения: backend category/transaction modules и общие finance helpers/DTO,
расширенный audit writer, HTTP registration/CORS/errors, OpenAPI/Orval artifacts;
frontend finance pages/forms/filters/list/pagination/session и необходимые fixes
общих primitives; PostgreSQL/component/browser/Compose tests и runner; README,
ARCHITECTURE, ROADMAP, web README, REPORT и название CI шага.

Stage 5 завершён. Stage 6 не начинался. Commit/push и изменение Git history
не выполнялись. Remote CI для этой незакоммиченной версии не запускался.

## Stage 6 — Budgets

Задание: выполнить только Stage 6, без commit/push и изменения history; законченный
budget workflow, реальная PostgreSQL/Compose, browser acceptance, self-review и
полный локальный набор команд CI на macOS. Использован Codex с локальными shell/patch tools;
новые зависимости не добавлялись, sub-agents не запускались.

Исследованы PROJECT, DISCOVERY, AI_RULES, ARCHITECTURE, ROADMAP и текущие README/REPORT,
CI, Compose runner, Prisma schema/migration/seed, Stage 4 auth/settings и Stage 5
finance/audit/client/UI/tests. Исходная рабочая копия была чистой; HEAD `352d4cb`
содержал Stage 5. По сообщению пользователя Stage 5 опубликован и remote CI зелёный;
старые записи документов о непубликации относятся к моменту завершения предыдущей
локальной работы, а не к текущему состоянию.

Scope из ROADMAP: CRUD expense-бюджетов, календарный месяц, лимит в baseCurrency,
серверная агрегация расходов, progress/over-budget, атомарный audit и demo-состояния
около/сверх лимита. Имеющиеся 16 seed budgets уже обеспечивают эти состояния:
перезаписывать seed и создавать дополнительную migration не требовалось.

Промежуточные результаты (не итоговая приёмка): backend 57/57, frontend 62/62.
Frozen install сначала не прошёл sandbox DNS; повтор с разрешённой сетью успешно
выполнил установку по прежнему lockfile и Prisma generate. Исправлены ошибки типов
и lint в новых тестах; неполные Problem Details fixtures давали generic client error,
fixtures приведены к существующему контракту без ослабления validation.

Первый Compose browser run: Stage 4/5 18/18; Stage 6 8/10. Найдены реальные дефекты:
панель могла закрыться по Escape между началом submit и обновлением Query observer;
sticky mobile navigation перекрывала часть touch targets длинного списка. Форма и
панель теперь разделяют синхронный ref-lock отправки; мобильный shell выделяет
прокручиваемую область над навигацией, route change сбрасывает её scrollTop.
Повтор Stage 4/5 18/18; Stage 6 9/10: исправления подтверждены, оставшееся падение
keyboard-теста вызвано нажатием Tab до загрузки options/включения submit. Тест теперь
ожидает реальный enabled state, без увеличения timeout/retries. Визуальная проверка
также обнаружила английское системное название месяца в native month input;
выбор периода заменён русскими Select/Input из существующих primitives.

### Отдельный self-review после первого полного зелёного набора

Первый полный набор до review: 57 backend, 62 frontend, 15 shell E2E, 18 Stage 4/5
Compose browser + 10 Stage 6 browser; отдельный Docker job — PASS. Все browser
прогоны без retries. Self-review отдельно проверил новые service/DTO/validation,
finance mutation integration, формы, accessibility, CSS, тесты и generated output.

Найдено и исправлено:

- Перехват любого P2002 внутри budget transaction маскировал технический duplicate
  audit INSERT под 409 бюджета. Новый real DB regression сначала получил 409 вместо
  ожидаемого безопасного 500; обработка сужена до Prisma modelName Budget. Проверены
  неизменность business state и отсутствие SQL/Prisma в Problem response.
- Поздняя загрузка category options оставляла native select визуально пустым при
  редактировании. Новый component test для исторической архивной категории упал
  на пустом value; controlled value из RHF устранил проблему. Добавлена browser
  проверка для обычной и архивной категории.
- Shell-only suite при переходе на новый маршрут пытался обратиться к отсутствующему
  API. Добавлен явный budget fixture по прежней схеме изолированных shell tests;
  настоящие бюджетные сценарии остаются в Compose suite.

Дополнены regressions: смена категории/суммы операции, перенос категории/периода
бюджета, archive/create race, стабильная пагинация 35 бюджетов, 10000 операций,
повтор формы после ошибки с Escape, выбор месяца по-русски, keyboard confirmation
и focus после удаления строки. Удерживаемый сетевой запрос в E2E освобождается
в finally. Отступ карточки уменьшен в пределах существующих tokens для читаемости
кнопок при 320px/200% text.

Затронутые проверки после исправлений: budget backend suite 19/19 (включая parent),
frontend 65/65, lint и typecheck пройдены. На 10000 операций SQL GROUP BY обработал
5000 строк нужного месяца через существующий transactions_userId_type_transactionDate_idx;
первый EXPLAIN ANALYZE: Planning 0.085 ms, Execution 0.885 ms, shared hit=113.
Это локальный замер на тестовой БД, не SLA. ORM выполняет один агрегирующий запрос
на категории страницы; число запросов не растёт по одному на бюджет. Данные чужих
владельцев и других месяцев отсекаются в PostgreSQL. Индексы/модель не менялись.

Повторная полная финальная приёмка выполняется после этих исправлений; её результаты
фиксируются ниже только по завершении команд.

Финальный после-review набор команд CI на macOS прошёл: backend 61/61, frontend 65/65,
shell 15/15; Compose browser 18/18 + 12/12 и отдельный Docker job — PASS.
Просмотр финальных PNG выявил дополнительную layout-регрессию: после выделения
scroll area flex-шапка могла сжаться до min-height и вынести строку профиля за
нижнюю границу. Добавлен shrink-0 шапки и browser assertion геометрии её children.
Финальные проверки повторяются после этого изменения; предыдущий PASS не подменяет
результат повторной проверки.

### Окончательные результаты после всех исправлений

Все команды ниже завершились успешно на последней версии кода, включая исправление
flex-шапки. Затем изменялась только итоговая документация. Использованы Node 24.21.0,
pnpm 12.4.1 и PostgreSQL 17.6; воспроизведены обе jobs текущего ci.yml локально.

| Проверка / команда                                                       | Фактический результат                                                     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                         | PASS, lockfile не изменён                                                 |
| `pnpm db:generate`, `pnpm db:validate`                                   | PASS                                                                      |
| Migrations deploy/reapply, constraints и runtime grants                  | PASS в реальной PostgreSQL integration fixture и Compose startup          |
| `pnpm lint`, `pnpm format:check`, `pnpm typecheck`                       | PASS                                                                      |
| `pnpm test` — backend                                                    | 61 passed, 0 failed; новый budget suite 19, включая parent                |
| `pnpm test` — frontend                                                   | 65 passed, 0 failed; 18 новых budget tests                                |
| `pnpm build`                                                             | PASS, API и production web                                                |
| `pnpm api:generate`, `pnpm api:check`                                    | PASS, OpenAPI/Orval воспроизводимы                                        |
| `pnpm --filter @finora/web exec playwright install --with-deps chromium` | PASS                                                                      |
| `pnpm test:e2e`                                                          | 15 passed, 0 failed, без retries                                          |
| `pnpm test:e2e:auth`                                                     | 18 существующих + 12 budget scenarios passed, 0 failed, без retries       |
| `pnpm test:docker`                                                       | PASS отдельного Docker job; тот же acceptance также прошёл с browser flag |
| `git diff --check`                                                       | PASS                                                                      |

Browser: 320×740, 390×844, 640×320, 768×1024, 1440×960, 1920×1080;
проверены overflow, большие суммы/длинные названия, Sheet, 200% text, reduced motion,
keyboard-only create/validation/confirmation/Escape/focus trap/restoration, текстовая
и ARIA семантика прогресса. Axe: 0 нарушений в проверяемых WCAG-наборах. Финальные
PNG просмотрены; геометрический regression test подтверждает границы шапки.

Docker: чистый workspace без .env/node_modules, build, migrate deploy, seed ×3,
healthy PostgreSQL/API/Nginx, auth, Stage 5 regression, budget CRUD, duplicate 409,
два настоящих владельца и 404 чужих объектов, чужие операции не меняют spent,
Decimal/date actual, сохранность edited/deleted state после API restart и seed.
Проверены repeated startup, readiness 200 → 503 → 200 и liveness при DB outage.
Baseline dataset SHA-256:
`55c7d9a51be58a2b6d685feb3d3057333c2dfd7fe6be729cbce3bf436a4c89b0`.
Runner удалил acceptance containers/volumes; отдельный тестовый PostgreSQL тоже
удалён. Финальная проверка Docker не нашла finora containers/acceptance volumes;
порт браузерного preview 4173 свободен. Логи и диагностические PNG находятся только
в /private/tmp, не в изменениях репозитория.

Финальные логи текущего запуска: `/private/tmp/finora-stage6-final-ci-2.log`,
`/private/tmp/finora-stage6-final-docker-2.log`,
`/private/tmp/finora-stage6-final-compose-browser-2.log`.

Ограничения проверки: браузерные тесты выполнены в Chromium, без физического телефона
и ручного screen-reader прогона. Production build сообщает предупреждение Vite
о JS chunk >500 kB; предупреждение не отключалось, это не провал build. Remote CI
Stage 6 не запускался, поскольку commit/push запрещены. Performance-замер не является
нагрузочным SLA. Новых продуктовых ограничений сверх принятого scope не добавлено.

Изменения по группам: backend BudgetsModule/DTO/validation/service и audit registration;
OpenAPI/Orval; budget page/form/month picker/progress/sheet и необходимые shell fixes;
реальные DB/component/Playwright/Compose regressions и acceptance runner; README,
web README, ARCHITECTURE, ROADMAP, REPORT. Схема, migrations, seed, dependencies и
lockfile не менялись. Финансовая арифметика остаётся Decimal/string; месяц операции
остаётся DATE, текущий месяц выбирается в timezone профиля.

Stage 6 завершён. Stage 7 и последующие этапы не начинались: Dashboard/Insights,
scheduler, CSV, audit UI, dark mode и прочий последующий scope отложены. Commit,
push и изменение Git history не выполнялись; HEAD остаётся `352d4cb`.

## Stage 6 — repair/review после remote FAILED (2026-09-14)

Запрос пользователя: исправить только Stage 6, отдельно исследовать 1440×960,
проверить portability/isolation и весь набор CI; Stage 7, commit и push запрещены.
Использованы Codex, skill diagnosing-bugs, shell/patch, read-only GitHub CLI,
Chromium/Playwright и локальный Docker. Sub-agents не запускались.
Начальная рабочая копия чистая, HEAD `f81e4f9`; remote run `34850152076` — FAILED.
Предыдущие записи «Stage 6 завершён» описывали локальную приёмку на macOS;
объявлять remote CI зелёным по этим результатам было бы неверно.

Remote GitHub Actions обнаружил два macOS-specific screenshot пути в
`apps/web/e2e/budgets.compose.spec.ts`: `/private/tmp/finora-stage6-${width}-normal.png`
и `/private/tmp/finora-stage6-${width}.png`. В macOS каталог уже существовал.
Docker acceptance запускал Linux приложение, но сам Playwright/Node runner оставался
на macOS: одинаковые команды не означали одинаковую host filesystem/platform.
Формулировка CI-equivalent заменена явным указанием macOS в README/ROADMAP/REPORT.
Исторические абсолютные пути логов в REPORT сохранены как фактические места старых
локальных файлов, а не переносимые команды.

Поиск по всем tracked source/tests/scripts/config: других host-specific temp paths
не найдено. Compose runner уже использовал `mkdtemp(join(os.tmpdir(), ...))`;
`/var/lib/postgresql/data`, `/var/lib/apt/lists`, `/etc/nginx`, `/usr/share/nginx/html`
и `/app` принадлежат закреплённым Linux images, а не filesystem хоста. Относительные
пути package scripts разрешаются из workspace/package cwd согласно entrypoints.

Причина 1440×960 подтверждена remote Nginx log: после перезапуска API в 13:41:01
между 13:41:07 и 13:41:25 было ровно 10 успешных POST /auth/login. Первые два —
beforeAll, третий — явный UI login, следующие — повторения beforeAll после ENOENT.
В 13:41:26 одиннадцатый вход получил 429 (лимит 10/min/IP). Тест 1440×960 отмечен
как 0 ms: тело не запустилось, ожидание «Обзор» упало в login hook. Это каскад через
общее серверное состояние rate limiter, а не responsive layout. Page/context каждого
viewport уже были свежими; общими были mutable cookies и семейный BrowserContext
в beforeAll. Setup повторялся после каждого failed test вместе с новым worker.

Промежуточная проверка изменения только screenshot paths: все шесть viewport,
включая 1440×960, прошли на macOS и Linux. Полный macOS run: 11/12 — отдельный axe
сбой keyboard-only; измерены переходные disabled/enabled цвета кнопки (3.63:1).
Перед axe теперь проверяется завершение реально выполняющихся Web Animations/CSS
transitions; набор WCAG rules и assertions сохранён, retries/timeouts не увеличены.
Первый Linux run под root также пропустил старый дефект: root мог создать /private/tmp.
Поэтому точное воспроизведение проведено под непривилегированным пользователем node.

Исправления: screenshot сохраняются через testInfo.outputPath и прикрепляются
к test report; подготовка двух настоящих demo-сессий вынесена в зависимый setup
project, каждый тест получает новый context/page из неизменяемого storageState.
Семейный context теперь test-scoped и закрывается в finally. UI login сохранён
и дополнен assertion HTTP 200 перед прежним assertion заголовка. Viewport tests
получили отдельные месяцы и cleanup созданных budget/transaction/category в finally.
Compose browser runner выделяет уникальный каталог результатов на каждый запуск,
печатает полный stdout/stderr дочернего процесса при падении и запускает regression.
Никакой production auth policy или новой функциональности не менялось.

Regression `scripts/check-stage6-e2e.mjs` запускает временную копию настоящего
budget suite: 5 намеренных падений после загрязнения cookies/localStorage/routes,
потом все 6 viewport; затем 12 viewport (repeat-each=2, workers=4). Проверяются
точные ожидаемые причины аварий, отсутствие любых других ошибок/retries,
наличие двух отдельных PNG на каждый viewport внутри заданного outputDir.
Ненулевой exit первого дочернего процесса — проверяемый результат fault injection,
не подавление ошибок основной suite. Временная копия/сессии удаляются в finally.

Точное Linux non-root воспроизведение исходного HEAD: 3 passed, 5 failed,
4 did not run. Четыре ENOENT и затем 1440×960 с 0 ms, stack login:28 → beforeAll:39,
Nginx POST /auth/login 429. Логи: `finora-stage6-repair-linux-nonroot-red.log`
и `finora-stage6-repair-linux-nonroot-http.log` в системном временном каталоге
диагностики. Первые проверки нового harness выявили ошибки его подготовки ESM
и ожидаемого DELETE status; исправлены по реальным package/API contracts.
Повтор regression на macOS прошёл: 5 ожидаемых worker failures + 6 passed viewport,
затем 12 passed viewport на 4 workers; все 36 PNG проверены.

### Подтверждённые результаты repair pass

После последних изменений tests/config/scripts выполнен весь набор команд
существующего CI на macOS (Node 24.21.0, pnpm 12.4.1, PostgreSQL 17.6),
а budgets и regression дополнительно выполнены в Linux без root и без /private/tmp.
Документация фиксирует этот успешный набор; на окончательной рабочей копии набор
проверяется повторно перед передачей результата. Ни один прежний диагностический
Failed не считается финальным Passed без последующего успешного запуска.

| Команда / проверка                                                                          | Результат                                                                                              |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`                                                            | Passed, lockfile без изменений                                                                         |
| `pnpm db:generate`, `pnpm db:validate`                                                      | Passed                                                                                                 |
| `pnpm format:check`                                                                         | Passed                                                                                                 |
| `pnpm lint`                                                                                 | Passed                                                                                                 |
| `pnpm typecheck`                                                                            | Passed                                                                                                 |
| `pnpm test` — backend                                                                       | Passed, 61/61, настоящая PostgreSQL                                                                    |
| `pnpm test` — frontend                                                                      | Passed, 65/65                                                                                          |
| `pnpm build`                                                                                | Passed, API + production web                                                                           |
| `pnpm api:generate`, `pnpm api:check`                                                       | Passed, generated output без diff                                                                      |
| `pnpm --filter @finora/web exec playwright install --with-deps chromium`                    | Passed                                                                                                 |
| `pnpm test:e2e`                                                                             | Passed, 15/15 shell                                                                                    |
| `pnpm test:e2e:auth`                                                                        | Passed, полный Docker + 18 auth/finance + 12 budget + 1 setup + regression                             |
| `pnpm --filter @finora/web exec playwright test budgets.compose.spec.ts`                    | Passed, 12/12 + 1 setup на macOS и Linux                                                               |
| `pnpm test:e2e:stage6-regression` / `node scripts/check-stage6-e2e.mjs`                     | Passed на macOS/Linux: 5 точных fault injections → 6 viewport; затем 12 viewport при workers=4; 36 PNG |
| `node scripts/test-docker.mjs` (точная команда отдельного CI job, также `pnpm test:docker`) | Passed                                                                                                 |
| Stage 6 browser acceptance                                                                  | Passed: 6 viewport, a11y/keyboard/200% text/Sheet; PNG просмотрены                                     |
| Linux portability                                                                           | Passed под пользователем node; `/private/tmp` отсутствовал до и после budget/regression run            |
| `git diff --check`                                                                          | Passed                                                                                                 |

Все обычные E2E прошли без retries и без skipped tests. Fault injection запускается
в отдельной временной копии и проверяет ровно заданные ошибки; в обычном budget
suite намеренных падений нет. Повторные ручные/локальные commands сами по себе
не являются добавлением retries в Playwright config. Vite сохранил прежнее
предупреждение о chunk >500 kB; лимит предупреждения не менялся.

Полный Docker acceptance: чистая копия без node_modules/.env, сборки, migrate deploy,
healthy web/API/PostgreSQL, HTTP/Swagger, seed ×3 без изменения baseline, readiness
200 → 503 → 200 и liveness при DB outage, повторный startup, финансовый CRUD,
category archive, budget CRUD/duplicate/ownership, чужие расходы не влияют на spent,
Decimal/date и сохранность edited/deleted state после seed/restart. Dataset SHA-256
`55c7d9a51be58a2b6d685feb3d3057333c2dfd7fe6be729cbce3bf436a4c89b0`.
Оба acceptance runner удалили свои containers/volumes в finally.

Self-review: responsive/a11y assertions и оба screenshot сохранены; retries/timeout
в конфиге не увеличены, skip/only не добавлены, auth policy не ослаблена.
Проверены fresh context/page, failure restart, session setup, отдельные месяцы и
cleanup, уникальные output paths, PNG signature, воспроизводимость клиента, отсутствие
случайных artifacts среди tracked/untracked исходников. Dependency versions,
lockfile, Prisma schema/migrations/seed и production application code без изменений.
`test-results` и временные screenshots/traces не включены в Git; диагностические
артефакты сохраняются вне рабочей копии после проверки.

Изменённые файлы (полный список): README.md, REPORT.md, ROADMAP.md,
apps/web/README.md, apps/web/e2e/budgets.compose.spec.ts,
apps/web/e2e/budget-session.ts, apps/web/e2e/budgets.setup.ts,
apps/web/playwright.config.ts, package.json, scripts/test-docker.mjs,
scripts/check-stage6-e2e.mjs. ARCHITECTURE.md прочитан; приложение и его архитектура
не менялись, поэтому правка этого документа не требуется.

Логи текущей приёмки находятся вне репозитория: `/private/tmp/finora-stage6-repair-final-logs/`,
`/private/tmp/finora-stage6-repair-final-compose-browser.log`,
`/private/tmp/finora-stage6-repair-final-docker.log`,
`/private/tmp/finora-stage6-repair-final-linux.log`. Эти пути — фактические локальные
места диагностики macOS, не пути в коде или переносимые инструкции запуска.

Статус remote: опубликованный run [34850152076](https://github.com/pw5rhn4tnn-dotcom/finora/actions/runs/34850152076)
остаётся FAILED для HEAD `f81e4f9`; исправления не опубликованы и новый remote
результат для них не получен. Повторный запуск старого SHA не проверил бы рабочую
копию. Stage 6 не объявляется прошедшим remote CI. Stage 7 не начат; roadmap scope
Stage 6 сохранён. Commit, push и изменение Git history не выполнялись.

## Повторный remote CI repair: Stage 5 DELETE/refetch race (2026-09-14)

Работа ограничена диагностикой и repair run
[34854794659](https://github.com/pw5rhn4tnn-dotcom/finora/actions/runs/34854794659),
SHA `42cc23c`. Stage 7 не начинался, новая функциональность не добавлялась.
Использован Codex и навык `diagnosing-bugs`; субагенты не использовались.
Commit/push в этой сессии не выполнялись.

### Remote evidence и границы доказательств

Команда runner: `pnpm --filter @finora/web exec playwright test auth.compose.spec.ts finance.compose.spec.ts`,
18 tests / 2 workers / retries=0. Падение Stage 5 после подтверждения удаления:
dialog hidden, `toHaveCount(0)` получил 1. GitHub logs прочитаны через `gh`.
Workflow создал trace на ephemeral runner, но не загрузил artifacts: API вернул
`total_count: 0`. Поэтому оригинальный remote trace/БД после завершения job
недоступны; их изучение или SQL-проверка задним числом не заявляются. Добавлен
upload failing trace/screenshot/error-context без setup storageState.

Remote Nginx зафиксировал конкретный запрос:
`DELETE /api/v1/transactions/4c005571-2cb7-447d-bc14-ec9f89f105b8`,
14:24:01 UTC, **HTTP 204, body 0 bytes**. Это та же запись, которая перед этим
получила PATCH 200. GET нового search-фильтра прошёл непосредственно перед DELETE;
нового GET списка после DELETE нет. HTTP 429 у этого DELETE не было.
Backend `remove` ожидает PostgreSQL transaction с удалением и audit INSERT до 204.

Все четыре remote HTTP 429 относятся к `POST /api/v1/AUTH/REGISTER/` в 14:24:21 UTC,
то есть примерно через 20 секунд после DELETE. Инициатор — intentional auth test,
Playwright request user-agent и X-Forwarded-For `192.0.2.5`–`.8`. В основном
remote browser flow других 429 в Nginx log нет. Это ожидаемый результат security
проверки, а не причина оставшейся строки.

### Root cause и детерминированное воспроизведение

Поиск имеет debounce 300 ms. После изменения текста новый query key начинает
первый GET, пока confirmation dialog уже открыт. Этот GET ещё не имеет `data`
и может читать snapshot до удаления. После DELETE 204 `useFinancialMutation`
вызывает `invalidateQueries`. В установленном TanStack Query `Query.fetch`
отменяет выполняющийся запрос при `cancelRefetch` только если `state.data !== undefined`.
Для первого GET он возвращает прежний promise. Его устаревший ответ становится
успешными данными; mutation callback закрывает dialog, не запустив чтение после DELETE.

Это **production race обновления кэша**. DELETE успешен, frontend mutation и
invalidation выполняются, frontend API error отсутствует. Dialog закрывается
после успешного DELETE и ожидания неверно выбранного GET; premature close до
mutation success не найден. Исходное DOM assertion корректно. Backend failure,
duplicate row, audit rollback и 429 не объясняют зафиксированный симптом.

Перед production fix четыре обычных чистых Linux/non-root прохода исходной точной
команды дали 18/18. Однако компонентный regression с управляемым promise дал
ровно expected 0 / received 1. Browser probe через настоящий production Nginx,
NestJS и PostgreSQL удержал полученный до DELETE snapshot до ответа DELETE:
`/api/v1/transactions/2f40e2cf-d15b-44fb-8dd4-510bead41c10` → 204,
последующий detail GET → 404, PostgreSQL `exists=false`, DELETE audit с корректным
`before` и `after=null`. После доставки старого snapshot dialog hidden,
`toHaveCount(0)` → 1, search GET count=1. Failing trace прочитан, его network events
сверены с Nginx/SQL. Первый probe выявил ошибку диагностического чтения пустого 204
через Chromium; отдельный запуск сразу после restart не дождался readiness.
Эти ошибки harness не выдаются за воспроизведение продуктового failure.

Fix: после server success сначала `cancelQueries(['finance', owner])`, затем
существующая invalidation/refetch и session invalidation. Abort signal уже передаётся
через generated client. Даже первый незавершённый GET теперь отменяется; активный
список перечитывается после mutation. Production лимиты, API/schema/seed/ownership,
таймауты, retries и CRUD assertions ради green не ослаблялись. Shell retries также
установлены в 0. Generated client вручную не редактировался.

### Связь с предыдущим repair и test isolation

`git diff 352d4cb HEAD` подтвердил отсутствие изменений в finance mutation helper,
DeleteConfirmation и обоих старых auth/finance compose specs. Последний repair
`42cc23c` изменил output paths, budget setup/dependencies и runner diagnostics,
но сохранил точную auth+finance команду, 2 CI workers, fullyParallel и serial mode
внутри старых файлов. Budget setup не участвовал в выборе auth+finance. Новый failure
обнаружил существовавшую с Stage 5 гонку, прямой causal relation с Stage 6 repair нет.

Прежние локальные проверки auth/finance выполнялись на macOS; Linux проверял
budgets и Stage 6 regression. Кроме того, одиночный успешный E2E не фиксирует
порядок GET snapshot / DELETE / response delivery. Четыре исходных Linux green
подтверждают, что одной смены ОС недостаточно для обнаружения этой гонки.
Прежний компонентный тест удаления проверял success notice; его mock списка
продолжал возвращать старую строку даже после 204. Он не проверял исчезновение
строки и первый GET нового query key. Теперь проверяются оба условия.

SecurityGuard хранит process-local Map по `policy:request.ip`: login 10/min,
register 5/hour; general API не расходует эти buckets. Nginx заменяет X-Forwarded-For
на source IP; глобальной Nginx limit zone нет. Новые browser contexts/workers
одного ingress делят bucket, состояние живёт до expiry/restart API. Поэтому
intentional limiter test архитектурно вынесен на отдельные API process, Nginx и
PostgreSQL с теми же production images и policy. Его новые assertions проверяют
точную последовательность 400×5 → 429×3, ещё один 429 из нового context с подменой
XFF, отсутствие 429 у register основного suite и успешные login/create/DELETE при
исчерпанном register bucket отдельного backend. Оба окружения удаляются runner.

Убрана зависимость auth/finance responsive cases от предыдущего успешного теста:
setup project сохраняет неизменяемые sessions; каждый case получает свежий context.
Профиль responsive подготовлен отдельно от UI registration test. Имена строятся из
run UUID + testId + repeatEachIndex; каждый finance case создаёт собственные records,
cleanup работает в fixture finally, удаляет транзакции перед категориями и проверяет 404. CRUD locator содержит полный уникальный suffix; DELETE привязан к ID полученного
POST 201. Audit сохраняется; accounts/audit удаляются только вместе с acceptance volume.

### Regression coverage и проверки

- Компонентный тест воспроизводит первый незавершённый GET нового фильтра,
  успешный DELETE и поздний устаревший snapshot. До fix — red 0/1; после — строка
  отсутствует, два GET, один DELETE.
- Compose regression управляет именно debounce через Playwright clock и доставкой
  настоящего server snapshot через promise; проверяет 201/200/204/404, исчезновение
  dialog/строки и второй GET. Networkidle, arbitrary sleep, skip/fixme/only нет.
- Delete UX tests для 429 и 503 проверяют сохранение ошибки внутри dialog, отсутствие
  потери строки при failure, pending/cancel, явный повтор пользователем и confirmed
  success с удалением строки. Автоматического повторения mutation нет.
- Finance responsive cases и auth profile больше не требуют выполнения CRUD/registration
  cases до них. Отдельно проверяются specs, порядок и workers 1/2/4.

Финальные результаты полного набора и stress приведены ниже.
Диагностика этой сессии: системные временные каталоги `finora-ci-repair` и
`finora-ci-matrix`; это фактические локальные artifacts, не пути приложения.
Linux harness: Node 24.21.0, pnpm 12.4.1, Playwright 1.63.0 / Chromium 153,
Debian Linux aarch64, uid=1000(node), `/private/tmp` отсутствует. Remote runner —
Ubuntu x86_64; идентичность distro/CPU не заявляется. Production API/Nginx/PostgreSQL
и versions/CI=1/2 workers/retries=0/setup graph воспроизведены.

### Завершённые финальные checks этой сессии

После последних production/test изменений выполнены проверки ниже. Изменения
документации и diagnostic upload workflow затем отдельно проверены форматированием
и diff check. `upload-artifact@v7.0.1`/Node 24 и его inputs сверены с официальным
`actions/upload-artifact/action.yml`; remote upload не выполнялся.

| Проверка                                                 | Результат                                                                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                                      | Passed                                                                                                                      |
| `pnpm lint`                                              | Passed                                                                                                                      |
| `pnpm typecheck`                                         | Passed                                                                                                                      |
| `pnpm test` — backend                                    | Passed, 61/61, отдельная настоящая PostgreSQL; macOS и Linux/non-root                                                       |
| `pnpm test` — frontend                                   | Passed, 67/67; macOS и Linux/non-root                                                                                       |
| `pnpm build`                                             | Passed, API + production frontend; macOS и Linux/non-root                                                                   |
| `pnpm api:generate`                                      | Passed, generated files без diff; macOS и Linux/non-root                                                                    |
| `pnpm api:check`                                         | Passed; macOS и Linux/non-root                                                                                              |
| `pnpm test:e2e`                                          | Passed, 15/15 shell, retries=0                                                                                              |
| `auth.compose.spec.ts` отдельно, workers=1               | Passed, 11 tests + setup                                                                                                    |
| `finance.compose.spec.ts` отдельно, workers=1            | Passed, 8 tests + setup                                                                                                     |
| auth + finance, workers=1                                | Passed, 19 tests + setup                                                                                                    |
| auth + finance, workers=4                                | Passed, 19 tests + setup                                                                                                    |
| Принудительно finance → auth, workers=1                  | Passed, 19 tests + setup                                                                                                    |
| Только auth responsive, workers=4, без registration case | Passed, 6 tests + setup                                                                                                     |
| Только finance responsive, workers=4, без CRUD case      | Passed, 6 tests + setup                                                                                                     |
| `budgets.compose.spec.ts`                                | Passed, 12 tests + setup; macOS и Linux/non-root                                                                            |
| `pnpm test:e2e:stage6-regression`                        | Passed, macOS и Linux/non-root: 5 ожидаемых worker failures → 6 viewport, затем 12 viewport при workers=4; 36 отдельных PNG |
| `pnpm test:docker`                                       | Passed, полный отдельный Docker acceptance                                                                                  |
| `pnpm test:e2e:auth`                                     | Passed, полный Docker + browser acceptance: 20 auth/finance/setup, 13 budget/setup, Stage 6 regression                      |
| `git diff --check`                                       | Passed                                                                                                                      |

Все matrix cases выполнены в Linux/non-root на отдельных чистых volumes. Первый
временный config для обратного порядка оказался вне ESM package scope и не загрузился;
его перенесли внутрь web package, затем все оставшиеся matrix checks прошли.
Изменения приложения из-за этого не требовались. Первые host integration checks
были заблокированы sandbox TCP EPERM; окончательный полный набор выполнен успешно
с доступом к отдельной PostgreSQL. Эти диагностические Failed не являются final Passed
без соответствующего успешного повторного запуска.

Docker acceptance подтвердил clean/repeated startup, все services healthy,
seed ×3 без изменения данных, outage PostgreSQL с readiness 200 → 503 → 200,
liveness во время outage, migrate/permissions, Swagger/HTTP, financial и budget
CRUD/ownership/Decimal/archive и persistence после seed/restart. Исходный dataset
SHA-256: `55c7d9a51be58a2b6d685feb3d3057333c2dfd7fe6be729cbce3bf436a4c89b0`.
Runner удалил основные и security containers/volumes и setup storageState.

Полный список изменённых файлов: `.github/workflows/ci.yml`, `ARCHITECTURE.md`,
`README.md`, `REPORT.md`, `apps/web/README.md`, `apps/web/e2e/auth.compose.spec.ts`,
`apps/web/e2e/finance.compose.spec.ts`, `apps/web/e2e/compose-session.ts`,
`apps/web/e2e/compose.setup.ts`, `apps/web/playwright.config.ts`,
`apps/web/src/features/finance/api.ts`, `apps/web/src/features/finance/finance.test.tsx`,
`scripts/test-docker.mjs`, `scripts/security-compose.mjs`.

Из production кода изменён только finance query/mutation helper. Backend, Nginx
configuration, Prisma/schema/migrations/seed, dependencies/lockfile, generated API
client и package scripts не менялись. Stage 7 не начат; commit/push не выполнялись.
Последний опубликованный remote run остаётся FAILED для исходного SHA. Новый remote
run рабочей копии не запускался; локальные результаты не объявляются remote green.

### Итог stress: 20 последовательных чистых проходов

**Passed: 20/20**, точная команда без дополнительных Playwright flags:
`pnpm --filter @finora/web exec playwright test auth.compose.spec.ts finance.compose.spec.ts`.
Каждый запуск: `CI=1`, Linux aarch64, uid=1000(node), 2 workers, retries=0,
новые main/security Compose containers и PostgreSQL volumes, те же закреплённые
production images; outputDir уникален. 19 cases + setup на запуск, итого **400 passed**,
0 failed/skipped/flaky/retries. Время самого Playwright: **20.4–32.4 s** на запуск.

После каждого запуска runner проверил 288 оставшихся seed-транзакций; общий
финальный анализ 20 HTTP/DB snapshots подтвердил:

- **180/180 transaction DELETE → HTTP 204, body 0 bytes**, включая cleanup;
- 40 DELETE audits для исходного CRUD и управляемого race regression: ID совпадает
  со snapshot, `before` сохранён, `after=null`, соответствующих транзакций в БД нет;
- **0 HTTP 429 в основном suite**;
- по 4 ожидаемых register 429 на отдельном security backend в каждом запуске;
- все 20 root-cause regressions проверили второй GET после DELETE и отсутствие строки.

Серия выполнена двумя последовательными блоками 1–10 и 11–20 на одном неизменном
production/test коде. Между проходами создавались чистые environments, повторного
запуска упавшего case не было. До fix отдельно зафиксированы четыре обычных Linux
18/18 green и детерминированные red component/browser probes; они не включены в
финальный stress счётчик. Эта проверка даёт повторяемое локальное evidence, не
является обещанием отсутствия любых будущих CI failures.

Артефакты финальной сверки: `/private/tmp/finora-ci-repair/verified-stress-1-20.json`,
`stress-1.log` … `stress-20.log` и соответствующие `-http.log`, `-db.json`,
`-security.log`; failing Linux trace — `trace-red-3/`, SQL — `race-db.json`.
Полные checks: `final-gates/`, `linux-gates.log`, `final-docker-acceptance.log`,
`final-browser-acceptance.log`; matrix — `/private/tmp/finora-ci-matrix/`,
Linux Stage 6 — `/private/tmp/finora-ci-stage6/result.log`.
