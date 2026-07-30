import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AccessTokenPayload } from '../auth.types';
import type { SecurityContext } from '../types/security-context';
import { SessionContextService } from '../sessions/session-context.service';

function extractAccessToken(request: Request): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;

  const tokenCookie = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('pampa_access='));

  if (!tokenCookie) return null;
  return decodeURIComponent(tokenCookie.slice('pampa_access='.length));
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly sessionContext: SessionContextService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET must contain at least 32 characters.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractAccessToken]),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer: 'pampa-api',
      audience: 'pampa-web',
    });
  }

  validate(payload: AccessTokenPayload): Promise<SecurityContext> {
    if (
      !payload.sub ||
      !payload.companyId ||
      !payload.sessionId ||
      !Number.isInteger(payload.tokenVersion)
    ) {
      throw new UnauthorizedException('La sesión no es válida.');
    }
    return this.sessionContext.resolve({
      userId: payload.sub,
      companyId: payload.companyId,
      sessionId: payload.sessionId,
      tokenVersion: payload.tokenVersion,
    });
  }
}
