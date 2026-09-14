import {
  createParamDecorator,
  Injectable,
  SetMetadata,
  type ExecutionContext,
  type CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Problem } from '../../common/problem.js';
import { SessionService, cookieName } from './session.service.js';

const publicRoute = 'finora:public';
export const Public = () => SetMetadata(publicRoute, true);
export type AuthRequest = Request & { user?: User };
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => {
    const user = context.switchToHttp().getRequest<AuthRequest>().user;
    if (!user)
      throw new Problem(401, 'authentication_error', 'Войдите в аккаунт');
    return user;
  },
);
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(publicRoute, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const cookies = request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .filter((part) => part.startsWith(`${cookieName}=`));
    if (cookies?.length !== 1)
      throw new Problem(401, 'authentication_error', 'Войдите в аккаунт');
    const id = await this.sessions.verify(
      cookies[0]!.slice(cookieName.length + 1),
    );
    const user = await this.prisma.client.user.findUnique({ where: { id } });
    if (!user)
      throw new Problem(
        401,
        'authentication_error',
        'Сессия недействительна. Войдите снова',
      );
    request.user = user;
    return true;
  }
}
