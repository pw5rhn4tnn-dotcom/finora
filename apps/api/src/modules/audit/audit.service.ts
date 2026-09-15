import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuditEntry, Prisma } from '../../generated/prisma/client.js';
import type { AuditQuery } from './audit.validation.js';

function view(row: AuditEntry) {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    before: row.before as Record<string, unknown> | null,
    after: row.after as Record<string, unknown> | null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}
  // Читает исключительно по userId владельца из auth context (ARCHITECTURE §16):
  // фильтры/пагинация не расширяют видимость за пределы собственных записей.
  // Полиморфная entityId не джойнится с живыми таблицами — запись читается из
  // audit_entries как есть, поэтому чтение не зависит от существования или
  // текущего состояния затронутой сущности (переименование/удаление не рвёт
  // историю) и не создаёт N+1 при росте объёма.
  async list(userId: string, q: AuditQuery) {
    const where: Prisma.AuditEntryWhereInput = {
      userId,
      ...(q.entityType !== 'ALL' ? { entityType: q.entityType } : {}),
      ...(q.entityId ? { entityId: q.entityId } : {}),
      ...(q.action !== 'ALL' ? { action: q.action } : {}),
      ...(q.dateFrom || q.dateTo
        ? {
            createdAt: {
              ...(q.dateFrom
                ? { gte: new Date(`${q.dateFrom}T00:00:00.000Z`) }
                : {}),
              ...(q.dateTo
                ? {
                    lt: new Date(
                      new Date(`${q.dateTo}T00:00:00.000Z`).getTime() +
                        86_400_000,
                    ),
                  }
                : {}),
            },
          }
        : {}),
    };
    const orderBy: Prisma.AuditEntryOrderByWithRelationInput[] = [
      { createdAt: 'desc' },
      { id: 'desc' },
    ];
    return this.prisma.client.$transaction(
      async (db) => ({
        items: (
          await db.auditEntry.findMany({
            where,
            orderBy,
            skip: (q.page - 1) * q.pageSize,
            take: q.pageSize,
          })
        ).map(view),
        total: await db.auditEntry.count({ where }),
        page: q.page,
        pageSize: q.pageSize,
      }),
      { isolationLevel: 'RepeatableRead' },
    );
  }
}
