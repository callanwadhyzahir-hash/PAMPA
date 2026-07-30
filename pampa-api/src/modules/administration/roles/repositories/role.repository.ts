import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../database/prisma.service';

const roleSelect = {
  id: true,
  name: true,
  description: true,
  system_code: true,
  is_system: true,
  is_active: true,
  created_at: true,
  updated_at: true,
  role_permission: {
    select: {
      permission: {
        select: {
          id: true,
          code: true,
          name: true,
          module: true,
          description: true,
        },
      },
    },
    orderBy: { permission: { code: 'asc' as const } },
  },
  _count: { select: { user_role: true } },
} as const;

@Injectable()
export class RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.role.findMany({
      where: { company_id: companyId },
      select: roleSelect,
      orderBy: [{ is_system: 'desc' }, { name: 'asc' }],
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.role.findFirst({
      where: { id, company_id: companyId },
      select: roleSelect,
    });
  }

  findByName(companyId: string, name: string, excludeId?: string) {
    return this.prisma.role.findFirst({
      where: {
        company_id: companyId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  actorIsOwner(companyId: string, actorUserId: string) {
    return this.prisma.user_role.findFirst({
      where: {
        user_id: actorUserId,
        user: { company_id: companyId, is_active: true },
        role: {
          company_id: companyId,
          system_code: 'OWNER',
          is_system: true,
          is_active: true,
        },
      },
      select: { user_id: true },
    });
  }

  create(companyId: string, data: { name: string; description?: string }) {
    return this.prisma.role.create({
      data: {
        company_id: companyId,
        name: data.name,
        description: data.description,
        system_code: null,
        is_system: false,
        is_active: true,
      },
      select: roleSelect,
    });
  }

  update(
    companyId: string,
    id: string,
    data: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.role.updateMany({
        where: {
          id,
          company_id: companyId,
          is_system: false,
          system_code: null,
        },
        data: {
          name: data.name,
          description: data.description,
          is_active: data.isActive,
        },
      });
      if (result.count !== 1) return null;
      return tx.role.findFirst({
        where: { id, company_id: companyId },
        select: roleSelect,
      });
    });
  }

  async delete(companyId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findFirst({
        where: { id, company_id: companyId },
        select: {
          id: true,
          is_system: true,
          system_code: true,
          _count: { select: { user_role: true } },
        },
      });
      if (!role) return { status: 'NOT_FOUND' as const };
      if (role.is_system || role.system_code) {
        return { status: 'SYSTEM_ROLE' as const };
      }
      if (role._count.user_role > 0) {
        return { status: 'ASSIGNED' as const };
      }
      await tx.role.delete({ where: { id: role.id } });
      return { status: 'DELETED' as const };
    });
  }

  findApprovedPermissions(codes: readonly string[]) {
    return this.prisma.permission.findMany({
      where: { code: { in: [...codes] } },
      select: {
        id: true,
        code: true,
        name: true,
        module: true,
        description: true,
      },
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  replacePermissions(input: {
    companyId: string;
    roleId: string;
    permissionIds: string[];
    approvedCodes: readonly string[];
    reservedCodes: readonly string[];
    actorIsOwner: boolean;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findFirst({
        where: { id: input.roleId, company_id: input.companyId },
        select: { id: true, is_system: true, system_code: true },
      });
      if (!role) return { status: 'ROLE_NOT_FOUND' as const };
      if (role.is_system || role.system_code) {
        return { status: 'SYSTEM_ROLE' as const };
      }

      const permissions = await tx.permission.findMany({
        where: {
          id: { in: input.permissionIds },
          code: { in: [...input.approvedCodes] },
        },
        select: { id: true, code: true },
      });
      if (permissions.length !== input.permissionIds.length) {
        return { status: 'PERMISSION_NOT_FOUND' as const };
      }
      if (
        !input.actorIsOwner &&
        permissions.some(({ code }) => input.reservedCodes.includes(code))
      ) {
        return { status: 'RESERVED_PERMISSION' as const };
      }

      await tx.role_permission.deleteMany({ where: { role_id: role.id } });
      if (permissions.length) {
        await tx.role_permission.createMany({
          data: permissions.map(({ id }) => ({
            role_id: role.id,
            permission_id: id,
          })),
          skipDuplicates: true,
        });
      }
      await tx.user.updateMany({
        where: { user_role: { some: { role_id: role.id } } },
        data: { token_version: { increment: 1 } },
      });
      return { status: 'UPDATED' as const };
    });
  }
}
