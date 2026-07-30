import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';

import type { AccessTokenPayload } from '../auth.types';
import { createOpaqueToken, hashOpaqueToken } from './session-token.util';
import { SessionRepository } from './session.repository';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class SessionService {
  constructor(
    private readonly repository: SessionRepository,
    private readonly jwt: JwtService,
  ) {}

  async create(input: {
    userId: string;
    companyId: string;
    tokenVersion: number;
    userAgent?: string;
  }) {
    const refreshToken = createOpaqueToken();
    const session = await this.repository.create({
      userId: input.userId,
      familyId: randomUUID(),
      refreshTokenHash: hashOpaqueToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      userAgent: input.userAgent,
    });
    return {
      accessToken: await this.signAccess({
        sub: input.userId,
        companyId: input.companyId,
        sessionId: session.id,
        tokenVersion: input.tokenVersion,
      }),
      refreshToken,
    };
  }

  async refresh(refreshToken: string, userAgent?: string) {
    const nextToken = createOpaqueToken();
    const result = await this.repository.rotate({
      currentHash: hashOpaqueToken(refreshToken),
      nextHash: hashOpaqueToken(nextToken),
      nextExpiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      userAgent,
    });
    if (result.status !== 'ROTATED') {
      throw new UnauthorizedException('La sesión no es válida.');
    }
    return {
      accessToken: await this.signAccess({
        sub: result.userId,
        companyId: result.companyId,
        sessionId: result.sessionId,
        tokenVersion: result.tokenVersion,
      }),
      refreshToken: nextToken,
    };
  }

  revoke(userId: string, sessionId: string) {
    return this.repository.revoke(userId, sessionId);
  }

  revokeAll(userId: string) {
    return this.repository.revokeAll(userId);
  }

  list(userId: string) {
    return this.repository.list(userId);
  }

  private signAccess(payload: AccessTokenPayload) {
    return this.jwt.signAsync(payload);
  }
}
