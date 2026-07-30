import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import type { RbacBootstrapInput } from './rbac.types';

@Injectable()
export class RbacRepository {
  constructor(private readonly prisma: PrismaService) {}

  bootstrap(input: RbacBootstrapInput) {
    return this.prisma.$transaction(async (tx) => {
      const permissionByCode = new Map<string, string>();

      for (const definition of input.permissions) {
        const permission = await tx.permission.upsert({
          where: { code: definition.code },
          create: definition,
          update: {
            name: definition.name,
            module: definition.module,
            description: definition.description,
          },
          select: { id: true, code: true },
        });
        permissionByCode.set(permission.code, permission.id);
      }

      const companies = await tx.company.findMany({
        where: { is_active: true },
        select: { id: true },
      });

      let rolesSynchronized = 0;
      let permissionSetsSynchronized = 0;

      for (const company of companies) {
        for (const definition of input.roles) {
          const conflictingCustomRole = await tx.role.findFirst({
            where: {
              company_id: company.id,
              name: definition.name,
              system_code: null,
            },
            select: { id: true },
          });

          if (conflictingCustomRole) {
            throw new Error(
              `Custom role name conflicts with system role ${definition.code}.`,
            );
          }

          const role = await tx.role.upsert({
            where: {
              company_id_system_code: {
                company_id: company.id,
                system_code: definition.code,
              },
            },
            create: {
              company_id: company.id,
              system_code: definition.code,
              name: definition.name,
              description: definition.description,
              is_system: true,
              is_active: true,
            },
            update: {
              name: definition.name,
              description: definition.description,
              is_system: true,
              is_active: true,
            },
            select: { id: true },
          });
          rolesSynchronized += 1;

          const permissionIds = input.matrix[definition.code].map((code) => {
            const permissionId = permissionByCode.get(code);
            if (!permissionId) {
              throw new Error(`Unknown permission in role matrix: ${code}.`);
            }
            return permissionId;
          });

          await tx.role_permission.deleteMany({
            where: {
              role_id: role.id,
              ...(permissionIds.length
                ? { permission_id: { notIn: permissionIds } }
                : {}),
            },
          });

          if (permissionIds.length) {
            await tx.role_permission.createMany({
              data: permissionIds.map((permissionId) => ({
                role_id: role.id,
                permission_id: permissionId,
              })),
              skipDuplicates: true,
            });
          }
          permissionSetsSynchronized += 1;
        }
      }

      return {
        permissionsSynchronized: input.permissions.length,
        activeCompanies: companies.length,
        systemRolesSynchronized: rolesSynchronized,
        rolePermissionSetsSynchronized: permissionSetsSynchronized,
      };
    });
  }

  assignOwnerByEmail(email: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { email },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          is_active: true,
          company_id: true,
          company: { select: { name: true, is_active: true } },
        },
      });

      if (!user) return { status: 'USER_NOT_FOUND' as const };
      if (!user.is_active) return { status: 'USER_INACTIVE' as const };
      if (!user.company.is_active) {
        return { status: 'COMPANY_INACTIVE' as const };
      }

      const ownerRole = await tx.role.findUnique({
        where: {
          company_id_system_code: {
            company_id: user.company_id,
            system_code: 'OWNER',
          },
        },
        select: {
          id: true,
          company_id: true,
          system_code: true,
          is_system: true,
          is_active: true,
        },
      });

      if (
        !ownerRole ||
        ownerRole.company_id !== user.company_id ||
        ownerRole.system_code !== 'OWNER' ||
        !ownerRole.is_system ||
        !ownerRole.is_active
      ) {
        return { status: 'OWNER_ROLE_UNAVAILABLE' as const };
      }

      const existing = await tx.user_role.findUnique({
        where: {
          user_id_role_id: { user_id: user.id, role_id: ownerRole.id },
        },
        select: { user_id: true },
      });

      await tx.user_role.upsert({
        where: {
          user_id_role_id: { user_id: user.id, role_id: ownerRole.id },
        },
        create: {
          user_id: user.id,
          role_id: ownerRole.id,
          company_id: user.company_id,
        },
        update: {},
      });

      return {
        status: 'ASSIGNED' as const,
        alreadyAssigned: Boolean(existing),
        userName: `${user.first_name} ${user.last_name}`,
        companyName: user.company.name,
      };
    });
  }

  replaceUserRoles(input: {
    actorUserId: string;
    companyId: string;
    targetUserId: string;
    roleIds: string[];
  }) {
    return this.executeOwnerMutation(input.companyId, async (tx) => {
      const [actor, target, roles] = await Promise.all([
        tx.user.findFirst({
          where: {
            id: input.actorUserId,
            company_id: input.companyId,
            is_active: true,
          },
          select: {
            user_role: {
              where: {
                role: {
                  company_id: input.companyId,
                  is_active: true,
                },
              },
              select: {
                role: { select: { system_code: true } },
              },
            },
          },
        }),
        tx.user.findFirst({
          where: { id: input.targetUserId, company_id: input.companyId },
          select: { id: true, is_active: true },
        }),
        tx.role.findMany({
          where: {
            id: { in: input.roleIds },
            company_id: input.companyId,
            is_active: true,
          },
          select: { id: true, system_code: true },
        }),
      ]);

      if (!actor) return { status: 'ACTOR_NOT_FOUND' as const };
      if (!target) return { status: 'TARGET_NOT_FOUND' as const };
      if (roles.length !== input.roleIds.length) {
        return { status: 'ROLE_NOT_FOUND' as const };
      }

      const actorIsOwner = actor.user_role.some(
        ({ role }) => role.system_code === 'OWNER',
      );
      const ownerRole = await tx.role.findUnique({
        where: {
          company_id_system_code: {
            company_id: input.companyId,
            system_code: 'OWNER',
          },
        },
        select: { id: true },
      });
      if (!ownerRole) return { status: 'OWNER_ROLE_UNAVAILABLE' as const };

      const currentOwner = await tx.user_role.findUnique({
        where: {
          user_id_role_id: {
            user_id: target.id,
            role_id: ownerRole.id,
          },
        },
        select: { user_id: true },
      });
      const wantsOwner = roles.some(
        ({ system_code }) => system_code === 'OWNER',
      );

      if ((currentOwner || wantsOwner) && !actorIsOwner) {
        return { status: 'OWNER_REQUIRES_OWNER' as const };
      }

      if (currentOwner && !wantsOwner && target.is_active) {
        const anotherOwner = await tx.user_role.findFirst({
          where: {
            user_id: { not: target.id },
            user: {
              company_id: input.companyId,
              is_active: true,
            },
            role: {
              company_id: input.companyId,
              system_code: 'OWNER',
              is_system: true,
              is_active: true,
            },
          },
          select: { user_id: true },
        });
        if (!anotherOwner) return { status: 'LAST_OWNER' as const };
      }

      await tx.user_role.deleteMany({
        where: {
          user_id: target.id,
          role: { company_id: input.companyId },
        },
      });
      if (roles.length) {
        await tx.user_role.createMany({
          data: roles.map(({ id }) => ({
            user_id: target.id,
            role_id: id,
            company_id: input.companyId,
          })),
          skipDuplicates: true,
        });
      }
      await tx.user.update({
        where: { id: target.id },
        data: { token_version: { increment: 1 } },
      });

      return { status: 'UPDATED' as const };
    });
  }

  executeOwnerMutation<T>(
    companyId: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${companyId}::text, 0)
        )
      `;
      return operation(tx);
    });
  }
}
