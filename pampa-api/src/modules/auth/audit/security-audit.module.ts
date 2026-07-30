import { Module } from '@nestjs/common';

import { SecurityAuditRepository } from './security-audit.repository';
import { SecurityAuditService } from './security-audit.service';

@Module({
  providers: [SecurityAuditRepository, SecurityAuditService],
  exports: [SecurityAuditService],
})
export class SecurityAuditModule {}
