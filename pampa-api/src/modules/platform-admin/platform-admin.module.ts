import { Module } from '@nestjs/common';

import { SecurityAuditModule } from '../auth/audit/security-audit.module';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminRepository } from './platform-admin.repository';
import { PlatformAdminService } from './platform-admin.service';

@Module({
  imports: [SecurityAuditModule],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminRepository, PlatformAdminService],
})
export class PlatformAdminModule {}
