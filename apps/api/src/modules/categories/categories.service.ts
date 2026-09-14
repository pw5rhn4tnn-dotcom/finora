import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditWriter } from '../audit/audit.module.js';
import { Problem } from '../../common/problem.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { CategoryInput, CategoryQuery } from '../finance/validation.js';
import { lockOwner, notFound } from '../finance/locking.js';
import { categoryView, recurringSnapshot } from '../finance/serialization.js';
@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriter,
  ) {}
  async list(userId: string, query: CategoryQuery) {
    const where = {
      userId,
      ...(query.state === 'all'
        ? {}
        : { archivedAt: query.state === 'active' ? null : { not: null } }),
    };
    return this.prisma.client.$transaction(
      async (db) => ({
        items: (
          await db.category.findMany({
            where,
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
          })
        ).map(categoryView),
        total: await db.category.count({ where }),
        page: query.page,
        pageSize: query.pageSize,
      }),
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async options(userId: string) {
    return (
      await this.prisma.client.category.findMany({
        where: { userId },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      })
    ).map(categoryView);
  }
  async get(userId: string, id: string) {
    return categoryView(await this.owned(this.prisma.client, userId, id));
  }
  private async owned(
    db: Prisma.TransactionClient,
    userId: string,
    id: string,
  ) {
    return (
      (await db.category.findFirst({ where: { userId, id } })) ?? notFound()
    );
  }
  private async used(
    db: Prisma.TransactionClient,
    userId: string,
    categoryId: string,
  ) {
    return !!(
      (await db.transaction.findFirst({
        where: { userId, categoryId },
        select: { id: true },
      })) ||
      (await db.budget.findFirst({
        where: { userId, categoryId },
        select: { id: true },
      })) ||
      (await db.recurringTransaction.findFirst({
        where: { userId, categoryId },
        select: { id: true },
      }))
    );
  }
  private async unique(
    db: Prisma.TransactionClient,
    userId: string,
    name: string,
    type: CategoryInput['type'],
    id?: string,
  ) {
    if (
      await db.category.findFirst({
        where: {
          userId,
          // Prisma insensitive equals uses ILIKE: keep names literal.
          name: {
            equals: name.replace(/[\\%_]/g, '\\$&'),
            mode: 'insensitive',
          },
          type,
          ...(id ? { id: { not: id } } : {}),
        },
        select: { id: true },
      })
    )
      throw new Problem(
        409,
        'conflict',
        'Категория этого типа с таким названием уже существует',
        { name: ['Используйте другое название'] },
      );
  }
  async create(userId: string, input: CategoryInput) {
    return this.prisma.client.$transaction(async (db) => {
      await lockOwner(db, userId);
      await this.unique(db, userId, input.name, input.type);
      const row = await db.category.create({ data: { ...input, userId } });
      await this.audit.categoryCreated(db, row);
      return categoryView(row);
    });
  }
  async update(userId: string, id: string, input: Partial<CategoryInput>) {
    return this.prisma.client.$transaction(async (db) => {
      await lockOwner(db, userId);
      const before = await this.owned(db, userId, id);
      if (
        input.type &&
        input.type !== before.type &&
        (await this.used(db, userId, id))
      )
        throw new Problem(
          409,
          'conflict',
          'Нельзя менять тип используемой категории',
          { type: ['Тип связан с финансовой историей'] },
        );
      await this.unique(
        db,
        userId,
        input.name ?? before.name,
        input.type ?? before.type,
        id,
      );
      const after = await db.category.update({
        where: { id, userId },
        data: input,
      });
      await this.audit.write(
        db,
        userId,
        'Category',
        id,
        'UPDATE',
        { ...categoryView(before), userId },
        { ...categoryView(after), userId },
      );
      return categoryView(after);
    });
  }
  async remove(userId: string, id: string) {
    return this.prisma.client.$transaction(async (db) => {
      await lockOwner(db, userId);
      const before = await this.owned(db, userId, id);
      if (await this.used(db, userId, id)) {
        if (!before.archivedAt) {
          const archivedAt = new Date();
          const after = await db.category.update({
            where: { id, userId },
            data: { archivedAt },
          });
          const rules = await db.recurringTransaction.findMany({
            where: { userId, categoryId: id, archivedAt: null },
          });
          for (const rule of rules) {
            const updated = await db.recurringTransaction.update({
              where: { id: rule.id, userId },
              data: { archivedAt },
            });
            await this.audit.write(
              db,
              userId,
              'RecurringTransaction',
              rule.id,
              'ARCHIVE',
              recurringSnapshot(rule, before.name),
              recurringSnapshot(updated, before.name),
            );
          }
          await this.audit.write(
            db,
            userId,
            'Category',
            id,
            'ARCHIVE',
            { ...categoryView(before), userId },
            { ...categoryView(after), userId },
          );
        }
        return { outcome: 'archived' as const };
      }
      await db.category.delete({ where: { id, userId } });
      await this.audit.write(
        db,
        userId,
        'Category',
        id,
        'DELETE',
        { ...categoryView(before), userId },
        null,
      );
      return { outcome: 'deleted' as const };
    });
  }
}
