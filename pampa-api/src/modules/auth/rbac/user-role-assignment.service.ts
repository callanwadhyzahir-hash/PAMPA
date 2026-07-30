import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { RbacRepository } from './rbac.repository';

@Injectable()
export class UserRoleAssignmentService {
  constructor(private readonly repository: RbacRepository) {}

  async replaceRoles(input: {
    actorUserId: string;
    actorCompanyId: string;
    targetUserId: string;
    roleIds: string[];
  }) {
    const result = await this.repository.replaceUserRoles({
      actorUserId: input.actorUserId,
      companyId: input.actorCompanyId,
      targetUserId: input.targetUserId,
      roleIds: input.roleIds,
    });

    switch (result.status) {
      case 'ACTOR_NOT_FOUND':
        throw new ForbiddenException('Actor no autorizado.');
      case 'TARGET_NOT_FOUND':
        throw new NotFoundException('Usuario no encontrado.');
      case 'ROLE_NOT_FOUND':
        throw new NotFoundException('Uno o más roles no fueron encontrados.');
      case 'OWNER_ROLE_UNAVAILABLE':
        throw new ConflictException('El rol OWNER no está configurado.');
      case 'OWNER_REQUIRES_OWNER':
        throw new ForbiddenException(
          'OWNER sólo puede ser administrado por otro OWNER.',
        );
      case 'LAST_OWNER':
        throw new ConflictException(
          'La empresa debe conservar al menos un OWNER activo.',
        );
      case 'UPDATED':
        return;
    }
  }
}
