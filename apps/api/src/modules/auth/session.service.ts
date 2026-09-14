import { Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify, errors } from 'jose';
import { Problem } from '../../common/problem.js';

export const cookieName = 'finora_session';
export const sessionTtl = 86400;
export const issuer = 'finora';
export const audience = 'finora-web';
@Injectable()
export class SessionService {
  private readonly secret: Uint8Array;
  readonly secure: boolean;
  readonly origins: string[];
  constructor() {
    const secret = process.env['AUTH_SECRET'];
    if (!secret || Buffer.byteLength(secret) < 32)
      throw new Error('AUTH_SECRET должен содержать минимум 32 байта');
    this.secret = new TextEncoder().encode(secret);
    this.secure = process.env['AUTH_COOKIE_SECURE'] !== 'false';
    this.origins = (
      process.env['AUTH_ORIGINS'] ??
      'http://localhost:8080,http://127.0.0.1:8080'
    ).split(',');
    for (const origin of this.origins) {
      if (new URL(origin).origin !== origin)
        throw new Error('AUTH_ORIGINS должен содержать точные origin без пути');
    }
  }
  sign(userId: string) {
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime(`${sessionTtl}s`)
      .sign(this.secret);
  }
  async verify(token: string): Promise<string> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: ['HS256'],
        issuer,
        audience,
        requiredClaims: ['sub', 'iat', 'exp'],
        maxTokenAge: sessionTtl,
      });
      if (
        !payload.sub ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          payload.sub,
        )
      )
        throw new Problem(
          401,
          'authentication_error',
          'Сессия недействительна. Войдите снова',
        );
      return payload.sub;
    } catch (error) {
      if (error instanceof errors.JOSEError)
        throw new Problem(
          401,
          'authentication_error',
          'Сессия недействительна. Войдите снова',
        );
      throw error;
    }
  }
  cookie(token: string, clear = false): string {
    return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : sessionTtl}${this.secure ? '; Secure' : ''}`;
  }
}
