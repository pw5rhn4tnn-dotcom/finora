# Finora

Finora — проект приложения для управления личными финансами. Продуктовые возможности
описаны в [DISCOVERY.md](DISCOVERY.md) и пока не реализованы.

**Статус: Stage 1 — Foundation локально готов.** Созданы pnpm
monorepo, минимальные React/Vite и NestJS приложения, строгая проверка TypeScript,
реальные smoke tests и workflow GitHub Actions. Удаленный CI еще не запускался.

## Требования для текущей разработки

- Node.js **24.21.0 LTS** — точная версия в `.nvmrc` и `package.json`.
- pnpm **12.4.1** — закреплен в `packageManager`; команда `pnpm` должна быть в `PATH`.
- Git и доступ к npm registry для первоначальной установки.

При использовании nvm выполните `nvm install` и `nvm use` из корня проекта.
Если pnpm предоставляется уже установленным Corepack, его shim должен быть включен
и доступен как `pnpm`; Corepack выберет версию из `packageManager`.
Проверить окружение: `node --version` и `pnpm --version`.

## Установка

Из корня репозитория:

```bash
pnpm install --frozen-lockfile
```

Все прямые зависимости закреплены точными версиями. `pnpm-workspace.yaml` включает
строгие проверки engines/peer dependencies. В итоговом графе нет зависимостей,
требующих разрешения install scripts. `verifyDepsBeforeRun: error` запрещает
автоматическую переустановку при запуске проверок: после изменения зависимостей
сначала явно выполните установку.

Для текущего режима БД, Docker и `.env` не требуются. Это локальная разработка
Foundation; будущий запуск всего продукта через Docker Compose еще не реализован.

## Разработка

В двух терминалах из корня:

```bash
pnpm dev:web
```

```bash
pnpm dev:api
```

Frontend: [http://127.0.0.1:5173](http://127.0.0.1:5173), только заголовок Finora
и сообщение «Приложение в разработке». Порт Vite фиксирован: занятый порт вызывает
ошибку, а не незаметное переключение на другой.

Backend слушает `127.0.0.1:3000`; маршрутов пока нет, HTTP-запрос возвращает 404.
Это ожидаемое состояние, не health endpoint и не предметный API.
После сборки API запускается через `pnpm --filter @finora/api start`.
Оба dev-процесса отслеживают изменения исходников; остановка — Ctrl+C.

## Команды проверок

| Команда                           | Назначение                                                                  |
| --------------------------------- | --------------------------------------------------------------------------- |
| `pnpm lint`                       | ESLint для кода обоих приложений и конфигов; предупреждения запрещены       |
| `pnpm format`                     | Форматирование изменяемых файлов через Prettier                             |
| `pnpm format:check`               | Проверка форматирования без записи                                          |
| `pnpm typecheck`                  | Strict TypeScript обоих приложений, включая тесты и Vite config             |
| `pnpm test`                       | Все текущие тесты frontend/backend                                          |
| `pnpm build`                      | Сборка обоих приложений                                                     |
| `pnpm --filter @finora/web test`  | Компонентный smoke через Vitest и Testing Library                           |
| `pnpm --filter @finora/api test`  | Компиляция тестов через tsc и настоящий Nest HTTP bootstrap через node:test |
| `pnpm --filter @finora/web build` | Проверка типов и сборка Vite                                                |
| `pnpm --filter @finora/api build` | Сборка Nest CLI через tsc                                                   |

Исходные `PROJECT.md`, `DISCOVERY.md` и `AI_RULES.md` исключены из автоматического
форматирования, чтобы сохранить утвержденные источники. Lockfile форматирует pnpm.
Сборки `dist`, `dist-test` и зависимости игнорируются Git и проверками исходников.

Тест frontend монтирует настоящий React-компонент в jsdom и проверяет содержимое.
Backend test запускает тот же bootstrap, что `main.ts`, на свободном loopback-порту,
проверяет разрешение `AppModule` через Nest DI и HTTP 404, затем закрывает приложение.
Тестовая сборка каждый раз очищается. Тесты не требуют работающего dev-сервера.
Проверки с настоящей PostgreSQL и Playwright относятся к последующим этапам.

## Структура

```text
apps/
  web/                 # React, Vite, компонентный smoke test
  api/                 # NestJS bootstrap и его HTTP smoke test
packages/
  api-client/          # Только manifest и описание границы генерации
.github/workflows/
  ci.yml               # Проверки Foundation
```

Общие TypeScript/ESLint/Prettier конфиги находятся в корне. У `@finora/api-client`
нет исходников, exports и фиктивных test/build scripts, поэтому рекурсивные
команды выполняют проверки приложений, а Prettier проверяет документы пакета.

## Контракты, API и инфраструктура

Выбран **Orval 8.33.0**, сейчас он не установлен: нет реальной OpenAPI-схемы для
генерации. Граница и порядок подключения зафиксированы в
[packages/api-client/README.md](packages/api-client/README.md).

Swagger UI, generated API client, PostgreSQL, Prisma, Docker Compose, Nginx,
authentication и demo-аккаунты пока отсутствуют. Адреса `/api/v1`, `/docs` и
health endpoints из архитектуры описывают будущую реализацию.

## CI

Workflow запускается на `push` и `pull_request`: checkout → Node → pnpm →
`pnpm install --frozen-lockfile` → lint → format check → typecheck → tests → build.
Используются те же команды, что локально. PostgreSQL/Docker jobs отсутствуют.
**Remote run: pending verification** — commit/push в рамках Stage 1 не выполняются.

## Документация

| Документ                           | Назначение                                         |
| ---------------------------------- | -------------------------------------------------- |
| [PROJECT.md](PROJECT.md)           | Исходное обязательное задание                      |
| [DISCOVERY.md](DISCOVERY.md)       | Утвержденная спецификация Finora v1.0              |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Техническая архитектура и решения Foundation       |
| [AI_RULES.md](AI_RULES.md)         | Правила работы coding-agent                        |
| [ROADMAP.md](ROADMAP.md)           | Границы этапов и критерии готовности               |
| [REPORT.md](REPORT.md)             | Фактические версии, проблемы и результаты проверок |
