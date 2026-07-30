import { Module } from '@nestjs/common';

import { OwnerProtectionService } from './owner-protection.service';
import { RbacBootstrapService } from './rbac-bootstrap.service';
import { RbacRepository } from './rbac.repository';
import { SystemRolePolicyService } from './system-role-policy.service';
import { UserRoleAssignmentService } from './user-role-assignment.service';

@Module({
  providers: [
    RbacRepository,
    RbacBootstrapService,
    OwnerProtectionService,
    SystemRolePolicyService,
    UserRoleAssignmentService,
  ],
  exports: [
    RbacBootstrapService,
    OwnerProtectionService,
    SystemRolePolicyService,
    UserRoleAssignmentService,
  ],
})
export class RbacModule {}
