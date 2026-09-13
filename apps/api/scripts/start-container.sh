#!/bin/sh
set -eu
node scripts/wait-database.mjs
node node_modules/prisma/build/index.js migrate deploy
node scripts/grant-runtime.mjs
node dist/prisma/seed.js
unset MIGRATION_DATABASE_URL
exec node dist/src/main.js
