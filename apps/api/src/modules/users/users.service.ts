import { Injectable } from '@nestjs/common';
import { Prisma, type User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Problem } from '../../common/problem.js';
import type { ProfileInputDto, UserDto } from './user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async financialDataExists(
    db: Prisma.TransactionClient,
    userId: string,
  ): Promise<boolean> {
    const rows = await db.$queryRaw<{ exists: boolean }[]>`
      SELECT (EXISTS(SELECT 1 FROM transactions WHERE "userId" = ${userId}::uuid)
        OR EXISTS(SELECT 1 FROM budgets WHERE "userId" = ${userId}::uuid)
        OR EXISTS(SELECT 1 FROM recurring_transactions WHERE "userId" = ${userId}::uuid)
        OR EXISTS(SELECT 1 FROM audit_entries WHERE "userId" = ${userId}::uuid AND "entityType" <> 'Category')) AS exists`;
    return rows[0]?.exists ?? false;
  }
  async view(user: User): Promise<UserDto> {
    return this.serialize(
      user,
      await this.financialDataExists(this.prisma.client, user.id),
    );
  }
  private serialize(user: User, baseCurrencyLocked: boolean): UserDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      baseCurrency: user.baseCurrency,
      timeZone: user.timeZone,
      baseCurrencyLocked,
    };
  }
  async update(userId: string, input: ProfileInputDto): Promise<UserDto> {
    return this.prisma.client.$transaction(async (db) => {
      // Финансовые записи последующих этапов должны брать эту же блокировку.
      await db.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user)
        throw new Problem(401, 'authentication_error', 'Войдите в аккаунт');
      const locked = await this.financialDataExists(db, userId);
      if (locked && input.baseCurrency !== user.baseCurrency)
        throw new Problem(
          409,
          'conflict',
          'Основную валюту нельзя менять после появления финансовых данных',
          {
            baseCurrency: [
              'Основная валюта уже используется в финансовой истории',
            ],
          },
        );
      return this.serialize(
        await db.user.update({ where: { id: userId }, data: input }),
        locked,
      );
    });
  }
}
