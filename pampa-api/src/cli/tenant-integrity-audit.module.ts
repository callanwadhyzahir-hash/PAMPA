import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../database/prisma.module';
import { TenantIntegrityRepository } from '../database/integrity/tenant-integrity.repository';
import { TenantIntegrityService } from '../database/integrity/tenant-integrity.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  providers: [TenantIntegrityRepository, TenantIntegrityService],
})
export class TenantIntegrityAuditModule {}
