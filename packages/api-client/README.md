# @finora/api-client

На Stage 1 это только граница workspace-пакета. Исходников, публичных exports,
DTO, сгенерированного клиента и команд генерации пока нет. Пакет не подключен к
приложениям и не объявляет фиктивные test/build scripts.

Зафиксирован **Orval 8.33.0**. Он генерирует TypeScript types и Fetch-клиент из
OpenAPI, а также поддерживает TanStack Query. Это соответствует будущему React
frontend без ручного копирования NestJS DTO. Зависимость сейчас не устанавливается:
реального контракта еще нет. Версия выбрана и проверена по npm metadata; генерация
Finora на Stage 1 не проверялась.

На Stage 2 backend сформирует реальный OpenAPI-документ через NestJS Swagger.
В этот пакет будет установлен именно `orval@8.33.0` как devDependency с записью в
lockfile; конфигурация будет читать экспортированную backend-схему и создавать
клиент/types внутри пакета. Генерация станет воспроизводимой командой workspace
и проверкой CI на рассинхронизацию с API. Generated-файлы не редактируются вручную.
TanStack Query hooks подключаются при появлении потребляющих их функций.

В пакет не входят Prisma-модели, серверные секреты, бизнес-логика и UI-компоненты.

Источники: [Orval / Fetch](https://orval.dev/docs/guides/fetch-client/),
[Orval / TanStack Query](https://orval.dev/docs/guides/react-query/).
