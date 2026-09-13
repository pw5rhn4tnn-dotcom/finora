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
