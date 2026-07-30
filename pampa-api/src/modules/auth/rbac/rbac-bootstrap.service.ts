import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ROLE_PERMISSION_MATRIX,
  SYSTEM_ROLES,
  TENANT_PERMISSIONS,
} from './rbac.definitions';
import { RbacRepository } from './rbac.repository';
import type {
  OwnerAssignmentSummary,
  RbacBootstrapSummary,
} from './rbac.types';

@Injectable()
export class RbacBootstrapService {
  constructor(private readonly repository: RbacRepository) {}

  bootstrap(): Promise<RbacBootstrapSummary> {
    return this.repository.bootstrap({
      permissions: TENANT_PERMISSIONS,
      roles: SYSTEM_ROLES,
      matrix: ROLE_PERMISSION_MATRIX,
    });
  }

  async assignInitialOwnerByEmail(
    rawEmail: string,
  ): Promise<OwnerAssignmentSummary> {
    const email = rawEmail.trim().toLowerCase();
    const result = await this.repository.assignOwnerByEmail(email);

    switch (result.status) {
      case 'USER_NOT_FOUND':
        throw new NotFoundException('Usuario no encontrado.');
      case 'USER_INACTIVE':
        throw new ConflictException('El usuario esta inactivo.');
      case 'COMPANY_INACTIVE':
        throw new ConflictException('La empresa del usuario esta inactiva.');
      case 'OWNER_ROLE_UNAVAILABLE':
        throw new ConflictException(
          'El rol OWNER no esta disponible para la empresa.',
        );
      case 'ASSIGNED':
        return {
          userName: result.userName,
          companyName: result.companyName,
          roleCode: 'OWNER',
          alreadyAssigned: result.alreadyAssigned,
        };
    }
  }
}
