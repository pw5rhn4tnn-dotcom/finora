# @finora/api-client

Stage 2: Orval **8.33.0** генерирует Fetch client и TypeScript types из реального
Swagger-контракта NestJS. Контракт Stages 2–7 содержит health, auth/settings, categories, transactions,
budgets и агрегированный dashboard, включая общие Problem Details.

Из корня: `pnpm api:generate`. Команда собирает API, экспортирует OpenAPI без listen
и DB connect, затем запускает Orval. `pnpm api:check` сравнивает файлы до/после той же
генерации и завершает проверку ошибкой при рассинхронизации. Оба файла хранятся в Git:
`openapi/finora.json`, `src/generated.ts`. Generated-код вручную не редактируется.

ESM-конфиг `orval.config.mjs` использует declarative object. Generated TypeScript
проверяется strict tsc; ручных дубликатов контрактов нет. Frontend вызывает этот клиент через feature query/mutation hooks.
TanStack Query hooks не генерируются до реальной потребности.

В пакет не входят Prisma-модели, серверные секреты, бизнес-логика и UI-компоненты.

Источники: [Nest Swagger](https://docs.nestjs.com/openapi/introduction),
[Orval Fetch](https://orval.dev/docs/guides/fetch-client/).
