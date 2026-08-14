import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { SecurityAuditService } from '../audit/security-audit.service';
import {
  createOpaqueToken,
  hashOpaqueToken,
} from '../sessions/session-token.util';
import { PasswordNotifierService } from './password-notifier.service';
import { PasswordRecoveryRepository } from './password-recovery.repository';

@Injectable()
export class PasswordRecoveryService {
  private readonly logger = new Logger(PasswordRecoveryService.name);

  constructor(
    private readonly repository: PasswordRecoveryRepository,
    private readonly notifier: PasswordNotifierService,
    private readonly audit: SecurityAuditService,
  ) {}

  async forgot(email: string) {
    const user = await this.repository.findActiveUserByEmail(email);
    if (user) {
      const token = createOpaqueToken();
      await this.repository.createToken(
        user.id,
        hashOpaqueToken(token),
        new Date(Date.now() + 30 * 60 * 1000),
      );
      try {
        await this.notifier.sendReset({
          email: user.email,
          firstName: user.first_name,
          token,
        });
      } catch (error) {
        this.logger.error('Password reset delivery failed.', error);
        await this.audit.record({
          companyId: user.company_id,
          targetUserId: user.id,
          eventType: 'PASSWORD_RESET_DELIVERY_FAILED',
          result: 'FAILURE',
        });
      }
      await this.audit.record({
        companyId: user.company_id,
        targetUserId: user.id,
        eventType: 'PASSWORD_RESET_REQUESTED',
        result: 'SUCCESS',
      });
    }
    return {
      message:
        'Si existe una cuenta activa con ese correo, recibirás instrucciones.',
    };
  }

  async reset(token: string, newPassword: string) {
    const result = await this.repository.resetPassword(
      hashOpaqueToken(token),
      await bcrypt.hash(newPassword, 12),
    );
    if (!result) {
      throw new UnauthorizedException('El enlace no es válido o ya venció.');
    }
    await this.audit.record({
      companyId: result.companyId,
      targetUserId: result.userId,
      eventType: 'PASSWORD_RESET_COMPLETED',
      result: 'SUCCESS',
    });
  }

  async change(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.repository.findUserById(userId);
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }
    const result = await this.repository.changePassword(
      userId,
      await bcrypt.hash(newPassword, 12),
    );
    await this.audit.record({
      companyId: result.company_id,
      actorUserId: userId,
      targetUserId: userId,
      eventType: 'PASSWORD_CHANGED',
      result: 'SUCCESS',
    });
  }
}
