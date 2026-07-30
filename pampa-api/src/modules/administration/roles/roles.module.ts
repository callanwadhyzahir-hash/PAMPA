import { Module } from '@nestjs/common';

import { RbacModule } from '../../auth/rbac/rbac.module';
import { SecurityAuditModule } from '../../auth/audit/security-audit.module';
import { RoleRepository } from './repositories/role.repository';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [RbacModule, SecurityAuditModule],
  controllers: [RolesController],
  providers: [RolesService, RoleRepository],
})
export class RolesModule {}
