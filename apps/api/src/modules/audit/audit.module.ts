import { Injectable, Module } from '@nestjs/common';
import { Prisma, type Category } from '../../generated/prisma/client.js';

@Injectable()
export class AuditWriter {
  async categoryCreated(db: Prisma.TransactionClient, category: Category) {
    const {
      id,
      userId,
      name,
      type,
      icon,
      color,
      archivedAt,
      createdAt,
      updatedAt,
    } = category;
    await db.auditEntry.create({
      data: {
        userId,
        entityId: id,
        entityType: 'Category',
        action: 'CREATE',
        after: {
          id,
          userId,
          name,
          type,
          icon,
          color,
          archivedAt: archivedAt?.toISOString() ?? null,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
      },
    });
  }
}
@Module({ providers: [AuditWriter], exports: [AuditWriter] })
export class AuditModule {}
