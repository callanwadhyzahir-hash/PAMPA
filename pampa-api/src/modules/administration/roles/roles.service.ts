import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  SYSTEM_ROLE_CODES,
  SYSTEM_ROLES,
  TENANT_PERMISSIONS,
} from '../../auth/rbac/rbac.definitions';
import { SystemRolePolicyService } from '../../auth/rbac/system-role-policy.service';
import type { SecurityContext } from '../../auth/types/security-context';
import { CreateRoleDto } from './dto/create-role.dto';
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RESERVED_DELEGATION_PERMISSIONS } from './role.permissions';
import { RoleRepository } from './repositories/role.repository';

const normalizeRoleName = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase();

const reservedRoleNames = new Set([
  ...SYSTEM_ROLE_CODES.map(normalizeRoleName),
  ...SYSTEM_ROLES.map(({ name }) => normalizeRoleName(name)),
]);

@Injectable()
export class RolesService {
  constructor(
    private readonly repository: RoleRepository,
    private readonly systemRolePolicy: SystemRolePolicyService,
  ) {}

  findAll(context: SecurityContext) {
    return this.repository.findAll(context.companyId);
  }

  async findOne(context: SecurityContext, id: string) {
    const role = await this.repository.findById(context.companyId, id);
    if (!role) throw new NotFoundException('Rol no encontrado.');
    return role;
  }

  async create(context: SecurityContext, input: CreateRoleDto) {
    const name = input.name.trim();
    this.assertCustomName(name);
    await this.assertUniqueName(context.companyId, name);

    try {
      return await this.repository.create(context.companyId, {
        name,
        description: input.description?.trim(),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un rol con ese nombre.');
      }
      throw error;
    }
  }

  async update(context: SecurityContext, id: string, input: UpdateRoleDto) {
    const role = await this.findOne(context, id);
    this.systemRolePolicy.assertCustomRoleCanBeMutated({
      companyId: context.companyId,
      systemCode: role.system_code,
      isSystem: role.is_system,
    });

    const name = input.name?.trim();
    if (name) {
      this.assertCustomName(name);
      await this.assertUniqueName(context.companyId, name, id);
    }

    const updated = await this.repository.update(context.companyId, id, {
      name,
      description: input.description?.trim() ?? input.description,
      isActive: input.isActive,
    });
    if (!updated) throw new NotFoundException('Rol no encontrado.');
    return updated;
  }

  async delete(context: SecurityContext, id: string) {
    const result = await this.repository.delete(context.companyId, id);
    switch (result.status) {
      case 'NOT_FOUND':
        throw new NotFoundException('Rol no encontrado.');
      case 'SYSTEM_ROLE':
        throw new ForbiddenException(
          'Los roles del sistema no pueden eliminarse.',
        );
      case 'ASSIGNED':
        throw new ConflictException(
          'El rol está asignado a uno o más usuarios.',
        );
      case 'DELETED':
        return;
    }
  }

  findPermissions() {
    return this.repository.findApprovedPermissions(
      TENANT_PERMISSIONS.map(({ code }) => code),
    );
  }

  async replacePermissions(
    context: SecurityContext,
    id: string,
    input: ReplaceRolePermissionsDto,
  ) {
    const actorIsOwner = Boolean(
      await this.repository.actorIsOwner(context.companyId, context.userId),
    );
    const result = await this.repository.replacePermissions({
      companyId: context.companyId,
      roleId: id,
      permissionIds: input.permissionIds,
      approvedCodes: TENANT_PERMISSIONS.map(({ code }) => code),
      reservedCodes: [...RESERVED_DELEGATION_PERMISSIONS],
      actorIsOwner,
    });

    switch (result.status) {
      case 'ROLE_NOT_FOUND':
        throw new NotFoundException('Rol no encontrado.');
      case 'SYSTEM_ROLE':
        throw new ForbiddenException(
          'Los permisos de roles del sistema son inmutables.',
        );
      case 'PERMISSION_NOT_FOUND':
        throw new NotFoundException(
          'Uno o más permisos no fueron encontrados.',
        );
      case 'RESERVED_PERMISSION':
        throw new ForbiddenException(
          'Sólo OWNER puede delegar permisos administrativos reservados.',
        );
      case 'UPDATED':
        return this.findOne(context, id);
    }
  }

  private assertCustomName(name: string) {
    if (reservedRoleNames.has(normalizeRoleName(name))) {
      throw new ConflictException(
        'El nombre está reservado para un rol del sistema.',
      );
    }
  }

  private async assertUniqueName(
    companyId: string,
    name: string,
    excludeId?: string,
  ) {
    if (await this.repository.findByName(companyId, name, excludeId)) {
      throw new ConflictException('Ya existe un rol con ese nombre.');
    }
  }
}
