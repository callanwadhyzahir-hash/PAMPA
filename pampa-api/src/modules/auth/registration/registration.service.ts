import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { EmailVerificationService } from '../email-verification/email-verification.service';
import { RegisterDto } from '../dto/register.dto';
import { RegistrationRepository } from './registration.repository';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly repository: RegistrationRepository,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const result = await this.repository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      companyName: dto.companyName,
      taxId: dto.taxId,
      email: dto.email,
      passwordHash,
    });

    // Runs after the tenant/OWNER transaction has committed: a transient
    // Resend failure must not roll back the company/user that was already
    // created. sendVerification() already swallows delivery errors and
    // records them via audit instead of throwing.
    await this.emailVerification.sendVerification({
      userId: result.userId,
      companyId: result.companyId,
      email: result.email,
      firstName: result.firstName,
    });

    return { userId: result.userId, companyId: result.companyId };
  }
}
