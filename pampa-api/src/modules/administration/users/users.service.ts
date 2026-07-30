import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import type { SecurityContext } from '../../auth/types/security-context';
import { OwnerProtectionService } from '../../auth/rbac/owner-protection.service';
import { UserRoleAssignmentService } from '../../auth/rbac/user-role-assignment.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ReplaceUserRolesDto } from './dto/replace-user-roles.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UserRepository,
    private readonly ownerProtection: OwnerProtectionService,
    private readonly roleAssignment: UserRoleAssignmentService,
  ) {}

  findAll(context: SecurityContext) {
    return this.repository.findAll(context.companyId);
  }

  async findOne(context: SecurityContext, id: string) {
    const user = await this.repository.findById(context.companyId, id);
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    return user;
  }

  async create(context: SecurityContext, input: CreateUserDto) {
    if (await this.repository.findByEmail(input.email)) {
      throw new ConflictException('El correo ya está registrado.');
    }
    await this.assertBranch(context.companyId, input.branchId);
    const passwordHash = await bcrypt.hash(input.temporaryPassword, 12);

    try {
      return await this.repository.create(context.companyId, {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email,
        passwordHash,
        phone: input.phone?.trim(),
        branchId: input.branchId,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('El correo ya está registrado.');
      }
      throw error;
    }
  }

  async update(context: SecurityContext, id: string, input: UpdateUserDto) {
    await this.findOne(context, id);
    await this.assertBranch(context.companyId, input.branchId);

    if (input.isActive === false) {
      this.assertNotSelf(context, id);
      await this.ownerProtection.deactivateUser(
        context.userId,
        id,
        context.companyId,
      );
      const remaining = {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        branchId: input.branchId,
      };
      return this.repository.update(context.companyId, id, remaining);
    }

    const updated = await this.repository.update(context.companyId, id, {
      firstName: input.firstName?.trim(),
      lastName: input.lastName?.trim(),
      phone: input.phone?.trim() ?? input.phone,
      branchId: input.branchId,
      isActive: input.isActive,
    });
    if (!updated) throw new NotFoundException('Usuario no encontrado.');
    return updated;
  }

  async deactivate(context: SecurityContext, id: string) {
    this.assertNotSelf(context, id);
    await this.findOne(context, id);
    await this.ownerProtection.deactivateUser(
      context.userId,
      id,
      context.companyId,
    );
  }

  async getRoles(context: SecurityContext, id: string) {
    const user = await this.findOne(context, id);
    return user.user_role.map(({ role }) => role);
  }

  async replaceRoles(
    context: SecurityContext,
    id: string,
    input: ReplaceUserRolesDto,
  ) {
    if (context.userId === id) {
      throw new ForbiddenException('No podés modificar tus propios roles.');
    }
    await this.findOne(context, id);
    await this.roleAssignment.replaceRoles({
      actorUserId: context.userId,
      actorCompanyId: context.companyId,
      targetUserId: id,
      roleIds: input.roleIds,
    });
    return this.getRoles(context, id);
  }

  private async assertBranch(companyId: string, branchId?: string | null) {
    if (
      branchId &&
      !(await this.repository.findActiveBranch(companyId, branchId))
    ) {
      throw new NotFoundException('Sucursal no encontrada.');
    }
  }

  private assertNotSelf(context: SecurityContext, targetId: string) {
    if (context.userId === targetId) {
      throw new ForbiddenException('No podés desactivar tu propia cuenta.');
    }
  }
}
