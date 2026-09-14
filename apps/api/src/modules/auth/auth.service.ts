import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Problem } from '../../common/problem.js';
import { AuditWriter } from '../audit/audit.module.js';
import { categoryTemplates } from '../categories/default-categories.js';
import { UsersService } from '../users/users.service.js';
import { hashPassword, verifyPassword } from './password.js';
import type { LoginInputDto, RegisterInputDto } from './auth.dto.js';

@Injectable()
export class AuthService {
  // Та же стоимость проверки для отсутствующего email; случайный пароль неизвестен клиенту.
  private readonly dummyHash = hashPassword('finora-auth-dummy-password');
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriter,
    private readonly users: UsersService,
  ) {}
  async register(input: RegisterInputDto) {
    const passwordHash = await hashPassword(input.password);
    try {
      const user = await this.prisma.client.$transaction(async (db) => {
        const user = await db.user.create({
          data: {
            email: input.email,
            passwordHash,
            displayName: input.displayName,
            baseCurrency: input.baseCurrency,
            timeZone: input.timeZone,
            themePreference: 'light',
          },
        });
        for (const { name, type, icon, color } of categoryTemplates) {
          const category = await db.category.create({
            data: { userId: user.id, name, type, icon, color },
          });
          await this.audit.categoryCreated(db, category);
        }
        return user;
      });
      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        baseCurrency: user.baseCurrency,
        timeZone: user.timeZone,
        baseCurrencyLocked: false,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new Problem(
          409,
          'conflict',
          'Не удалось зарегистрировать аккаунт с этим email',
          { email: ['Этот email уже используется'] },
        );
      throw error;
    }
  }
  async login(input: LoginInputDto) {
    const user = await this.prisma.client.user.findFirst({
      where: { email: { equals: input.email, mode: 'insensitive' } },
    });
    const valid = await verifyPassword(
      input.password,
      user?.passwordHash ?? (await this.dummyHash),
    );
    if (!user || !valid)
      throw new Problem(
        401,
        'authentication_error',
        'Неверный email или пароль',
      );
    return this.users.view(user);
  }
}
