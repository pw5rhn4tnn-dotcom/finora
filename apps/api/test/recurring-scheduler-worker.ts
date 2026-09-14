// Отдельный OS-процесс, воспроизводящий Stage 8 multi-instance сценарий:
// несколько независимых API instance используют одну PostgreSQL. Никакого
// общего in-memory состояния с родительским тестом или другими worker —
// корректность должна обеспечиваться исключительно БД (locking + unique).
import { createDatabaseClient } from '../src/prisma/client.js';
import { AuditWriter } from '../src/modules/audit/audit.module.js';
import { runSchedulerTick } from '../src/modules/recurring/engine.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';

const [, , databaseUrl, nowIso] = process.argv;
if (!databaseUrl || !nowIso)
  throw new Error('Usage: recurring-scheduler-worker <databaseUrl> <nowIso>');

const prisma = {
  client: createDatabaseClient(databaseUrl),
} as unknown as PrismaService;
const audit = new AuditWriter();
try {
  const result = await runSchedulerTick(prisma, audit, new Date(nowIso));
  process.stdout.write(JSON.stringify(result));
} finally {
  await prisma.client.$disconnect();
}
