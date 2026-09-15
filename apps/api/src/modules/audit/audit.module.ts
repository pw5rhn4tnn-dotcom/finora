import { Injectable, Module } from '@nestjs/common';
import { Prisma, type Category } from '../../generated/prisma/client.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuditController } from './audit.controller.js';
import { AuditService } from './audit.service.js';

@Injectable()
export class AuditWriter {
  async write(
    db: Prisma.TransactionClient,
    userId: string,
    entityType: 'Budget' | 'Category' | 'Transaction' | 'RecurringTransaction',
    entityId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE',
    before: Prisma.InputJsonObject | null,
    after: Prisma.InputJsonObject | null,
  ) {
    await db.auditEntry.create({
      data: {
        userId,
        entityType,
        entityId,
        action,
        before: before ?? Prisma.DbNull,
        after: after ?? Prisma.DbNull,
      },
    });
  }

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
@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [AuditWriter, AuditService],
  exports: [AuditWriter],
})
export class AuditModule {}
