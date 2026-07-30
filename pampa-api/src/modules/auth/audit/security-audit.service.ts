import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { SecurityAuditRepository } from './security-audit.repository';

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(private readonly repository: SecurityAuditRepository) {}

  async record(input: {
    companyId?: string;
    actorUserId?: string;
    targetUserId?: string;
    sessionId?: string;
    eventType: string;
    result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
    metadata?: Prisma.InputJsonValue;
  }) {
    try {
      await this.repository.create(input);
    } catch {
      this.logger.error(
        `Security audit persistence failed: ${input.eventType}`,
      );
    }
  }

  findForCompany(companyId: string) {
    return this.repository.findForCompany(companyId);
  }
}
