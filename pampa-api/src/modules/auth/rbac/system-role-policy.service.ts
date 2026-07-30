import { ForbiddenException, Injectable } from '@nestjs/common';

export interface RolePolicyTarget {
  companyId: string;
  systemCode: string | null;
  isSystem: boolean;
}

@Injectable()
export class SystemRolePolicyService {
  assertCustomRoleCanBeMutated(role: RolePolicyTarget) {
    if (role.isSystem || role.systemCode) {
      throw new ForbiddenException(
        'Los roles del sistema no pueden modificarse, desactivarse o eliminarse.',
      );
    }
  }

  assertRoleBelongsToCompany(role: RolePolicyTarget, companyId: string) {
    if (role.companyId !== companyId) {
      throw new ForbiddenException('El rol no pertenece a la empresa.');
    }
  }

  assertOwnerAssignmentAllowed(actorIsOwner: boolean, targetIsActor: boolean) {
    if (!actorIsOwner || targetIsActor) {
      throw new ForbiddenException(
        'OWNER solo puede ser administrado por otro OWNER.',
      );
    }
  }
}
