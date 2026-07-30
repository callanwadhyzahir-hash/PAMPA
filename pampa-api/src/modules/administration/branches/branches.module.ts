import { Module } from '@nestjs/common';

import { BranchRepository } from './repositories/branch.repository';
import { SecurityAuditModule } from '../../auth/audit/security-audit.module';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

@Module({
  imports: [SecurityAuditModule],
  controllers: [BranchesController],
  providers: [BranchesService, BranchRepository],
})
export class BranchesModule {}
