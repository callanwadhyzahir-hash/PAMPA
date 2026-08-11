import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

const contextUserSelect = {
  id: true,
  company_id: true,
  branch_id: true,
  first_name: true,
  last_name: true,
  email: true,
  is_active: true,
  token_version: true,
  company: {
    select: { id: true, name: true, is_active: true },
  },
  platform_admin: {
    select: { id: true },
  },
  user_role: {
    select: {
      role: {
        select: {
          company_id: true,
          system_code: true,
          name: true,
          is_active: true,
          role_permission: {
            select: { permission: { select: { code: true } } },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    userId: string;
    familyId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
  }) {
    return this.prisma.session.create({
      data: {
        user_id: input.userId,
        family_id: input.familyId,
        refresh_token_hash: input.refreshTokenHash,
        expires_at: input.expiresAt,
        user_agent: input.userAgent?.slice(0, 255),
      },
      select: { id: true, family_id: true },
    });
  }

  findContext(input: {
    sessionId: string;
    userId: string;
    companyId: string;
    tokenVersion: number;
  }) {
    return this.prisma.session.findFirst({
      where: {
        id: input.sessionId,
        user_id: input.userId,
        revoked_at: null,
        expires_at: { gt: new Date() },
        user: {
          company_id: input.companyId,
          token_version: input.tokenVersion,
          is_active: true,
          company: { is_active: true },
        },
      },
      select: { id: true, user: { select: contextUserSelect } },
    });
  }

  rotate(input: {
    currentHash: string;
    nextHash: string;
    nextExpiresAt: Date;
    userAgent?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.session.findUnique({
        where: { refresh_token_hash: input.currentHash },
        select: {
          id: true,
          family_id: true,
          user_id: true,
          expires_at: true,
          revoked_at: true,
          user: {
            select: {
              id: true,
              company_id: true,
              token_version: true,
              is_active: true,
              company: { select: { is_active: true } },
            },
          },
        },
      });
      if (!current) return { status: 'INVALID' as const };

      if (
        current.revoked_at ||
        current.expires_at <= new Date() ||
        !current.user.is_active ||
        !current.user.company.is_active
      ) {
        await tx.session.updateMany({
          where: { family_id: current.family_id, revoked_at: null },
          data: { revoked_at: new Date() },
        });
        return { status: 'REUSED_OR_INACTIVE' as const };
      }

      await tx.session.update({
        where: { id: current.id },
        data: { revoked_at: new Date() },
      });
      const next = await tx.session.create({
        data: {
          user_id: current.user_id,
          family_id: current.family_id,
          refresh_token_hash: input.nextHash,
          expires_at: input.nextExpiresAt,
          user_agent: input.userAgent?.slice(0, 255),
        },
        select: { id: true },
      });

      return {
        status: 'ROTATED' as const,
        sessionId: next.id,
        userId: current.user.id,
        companyId: current.user.company_id,
        tokenVersion: current.user.token_version,
      };
    });
  }

  revoke(userId: string, sessionId: string) {
    return this.prisma.session.updateMany({
      where: { id: sessionId, user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  revokeAll(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: { user_id: userId, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      await tx.user.update({
        where: { id: userId },
        data: { token_version: { increment: 1 } },
      });
    });
  }

  list(userId: string) {
    return this.prisma.session.findMany({
      where: {
        user_id: userId,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      select: {
        id: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
        expires_at: true,
      },
      orderBy: { updated_at: 'desc' },
    });
  }
}
