import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class EmailVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUnverifiedActiveUserByEmail(email: string) {
    // Deliberately no `company: { is_active: true }` filter — every new
    // signup's company starts suspended pending platform-admin approval
    // (see RegistrationRepository.create), so requiring an active company
    // here would silently break "resend" for every brand-new user. Email
    // verification and company approval are independent gates.
    return this.prisma.user.findFirst({
      where: {
        email,
        is_active: true,
        email_verified_at: null,
      },
      select: { id: true, company_id: true, email: true, first_name: true },
    });
  }

  createToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.$transaction(async (tx) => {
      await tx.email_verification_token.updateMany({
        where: { user_id: userId, used_at: null },
        data: { used_at: new Date() },
      });
      return tx.email_verification_token.create({
        data: {
          user_id: userId,
          token_hash: tokenHash,
          expires_at: expiresAt,
        },
        select: { id: true },
      });
    });
  }

  verifyToken(tokenHash: string) {
    return this.prisma.$transaction(async (tx) => {
      const token = await tx.email_verification_token.findUnique({
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
      const consumed = await tx.email_verification_token.updateMany({
        where: { id: token.id, used_at: null },
        data: { used_at: new Date() },
      });
      if (consumed.count !== 1) return null;

      await tx.user.update({
        where: { id: token.user_id },
        data: { email_verified_at: new Date() },
      });
      return {
        userId: token.user_id,
        companyId: token.user.company_id,
      };
    });
  }
}
