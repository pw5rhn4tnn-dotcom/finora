import {
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { Problem } from '../../common/problem.js';
import { SessionService } from './session.service.js';

export const AuthRateLimit = (policy: 'login' | 'register') =>
  SetMetadata('finora:auth-rate', policy);

@Injectable()
export class SecurityGuard implements CanActivate {
  private readonly buckets = new Map<
    string,
    { count: number; until: number }
  >();
  constructor(
    private readonly sessions: SessionService,
    private readonly reflector: Reflector,
  ) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    if (
      !request.headers.origin ||
      !this.sessions.origins.includes(request.headers.origin)
    )
      throw new Problem(
        403,
        'authorization_error',
        'Источник запроса не разрешён',
      );
    const policy = this.reflector.get<'login' | 'register'>(
      'finora:auth-rate',
      context.getHandler(),
    );
    if (!policy) return true;
    const now = Date.now();
    for (const [key, bucket] of this.buckets)
      if (bucket.until <= now) this.buckets.delete(key);
    const login = policy === 'login';
    const limit = login ? 10 : 5;
    const windowMs = login ? 60000 : 3600000;
    const key = `${policy}:${request.ip}`;
    const bucket = this.buckets.get(key) ?? { count: 0, until: now + windowMs };
    // Ограничиваем также память процесса; новые адреса не вытесняют активные лимиты.
    if (!this.buckets.has(key) && this.buckets.size >= 10000) {
      response.setHeader('Retry-After', '60');
      throw new Problem(
        429,
        'rate_limit',
        'Слишком много запросов. Повторите позже',
      );
    }
    this.buckets.set(key, bucket);
    if (++bucket.count > limit) {
      response.setHeader('Retry-After', Math.ceil((bucket.until - now) / 1000));
      throw new Problem(
        429,
        'rate_limit',
        'Слишком много попыток. Повторите позже',
      );
    }
    return true;
  }
}
