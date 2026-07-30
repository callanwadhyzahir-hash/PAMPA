import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class PasswordRecoveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, is_active: true, company: { is_active: true } },
      select: {
        id: true,
        company_id: true,
        email: true,
        first_name: true,
        password_hash: true,
      },
    });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, company_id: true, password_hash: true },
    });
  }

  createToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.$transaction(async (tx) => {
      await tx.password_reset_token.updateMany({
        where: { user_id: userId, used_at: null },
        data: { used_at: new Date() },
      });
      return tx.password_reset_token.create({
        data: {
          user_id: userId,
          token_hash: tokenHash,
          expires_at: expiresAt,
        },
        select: { id: true },
      });
    });
  }

  resetPassword(tokenHash: string, passwordHash: string) {
    return this.prisma.$transaction(async (tx) => {
      const token = await tx.password_reset_token.findUnique({
        where: { token_hash: tokenHash },
        select: {
          id: true,
          user_id: true,
          expires_at: true,
          used_at: true,
          user: { select: { company_id: true, is_active: true } },
        },
      });
      if (
        !token ||
        token.used_at ||
        token.expires_at <= new Date() ||
        !token.user.is_active
      ) {
        return null;
      }
      const consumed = await tx.password_reset_token.updateMany({
        where: { id: token.id, used_at: null },
        data: { used_at: new Date() },
      });
      if (consumed.count !== 1) return null;

      await tx.user.update({
        where: { id: token.user_id },
        data: {
          password_hash: passwordHash,
          token_version: { increment: 1 },
          updated_at: new Date(),
        },
      });
      await tx.session.updateMany({
        where: { user_id: token.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      return {
        userId: token.user_id,
        companyId: token.user.company_id,
      };
    });
  }

  changePassword(userId: string, passwordHash: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          password_hash: passwordHash,
          token_version: { increment: 1 },
          updated_at: new Date(),
        },
        select: { company_id: true },
      });
      await tx.session.updateMany({
        where: { user_id: userId, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      return user;
    });
  }
}
