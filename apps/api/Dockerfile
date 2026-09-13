FROM node:24.21.0-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@12.4.1
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts
RUN pnpm install --frozen-lockfile
COPY apps/api apps/api
RUN pnpm --filter @finora/api build
RUN pnpm --filter @finora/api deploy --prod --legacy /out

FROM node:24.21.0-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
CMD ["sh", "scripts/start-container.sh"]
