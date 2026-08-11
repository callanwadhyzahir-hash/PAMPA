import { Injectable, UnauthorizedException } from '@nestjs/common';

import { SecurityAuditService } from '../audit/security-audit.service';
import {
  createOpaqueToken,
  hashOpaqueToken,
} from '../sessions/session-token.util';
import { EmailVerificationNotifierService } from './email-verification-notifier.service';
import { EmailVerificationRepository } from './email-verification.repository';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const NEUTRAL_RESEND_RESPONSE = {
  message:
    'Si existe una cuenta pendiente para ese correo, enviamos un nuevo enlace.',
};

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly repository: EmailVerificationRepository,
    private readonly notifier: EmailVerificationNotifierService,
    private readonly audit: SecurityAuditService,
  ) {}

  async sendVerification(input: {
    userId: string;
    companyId: string;
    email: string;
    firstName: string;
  }) {
    const token = createOpaqueToken();
    await this.repository.createToken(
      input.userId,
      hashOpaqueToken(token),
      new Date(Date.now() + TOKEN_TTL_MS),
    );
    try {
      await this.notifier.sendVerification({
        email: input.email,
        firstName: input.firstName,
        token,
      });
      await this.audit.record({
        companyId: input.companyId,
        targetUserId: input.userId,
        eventType: 'EMAIL_VERIFICATION_SENT',
        result: 'SUCCESS',
      });
    } catch {
      await this.audit.record({
        companyId: input.companyId,
        targetUserId: input.userId,
        eventType: 'EMAIL_VERIFICATION_DELIVERY_FAILED',
        result: 'FAILURE',
      });
    }
  }

  async resend(email: string) {
    const user = await this.repository.findUnverifiedActiveUserByEmail(email);
    if (user) {
      await this.sendVerification({
        userId: user.id,
        companyId: user.company_id,
        email: user.email,
        firstName: user.first_name,
      });
    }
    return NEUTRAL_RESEND_RESPONSE;
  }

  async verify(token: string) {
    const result = await this.repository.verifyToken(hashOpaqueToken(token));
    if (!result) {
      throw new UnauthorizedException('El enlace no es válido o ya venció.');
    }
    await this.audit.record({
      companyId: result.companyId,
      targetUserId: result.userId,
      eventType: 'EMAIL_VERIFIED',
      result: 'SUCCESS',
    });
  }
}
