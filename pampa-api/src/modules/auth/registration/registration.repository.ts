import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import {
  ROLE_PERMISSION_MATRIX,
  SYSTEM_ROLES,
  TENANT_PERMISSIONS,
} from '../rbac/rbac.definitions';

@Injectable()
export class RegistrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    firstName: string;
    lastName: string;
    companyName: string;
    taxId: string;
    email: string;
    passwordHash: string;
  }) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const [companyType, taxCondition, currency] = await Promise.all([
          tx.company_type.findUnique({ where: { code: 'PERSONA_FISICA' } }),
          tx.tax_condition.findUnique({ where: { code: 'MONOTRIBUTISTA' } }),
          tx.currency.findUnique({ where: { code: 'ARS' } }),
        ]);
        if (!companyType || !taxCondition || !currency) {
          throw new ConflictException(
            'El alta no está disponible hasta completar los datos maestros.',
          );
        }

        const permissionIds = new Map<string, string>();
        for (const definition of TENANT_PERMISSIONS) {
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
          permissionIds.set(permission.code, permission.id);
        }

        const company = await tx.company.create({
          data: {
            company_type_id: companyType.id,
            tax_condition_id: taxCondition.id,
            currency_id: currency.id,
            name: input.companyName,
            tax_id: input.taxId,
          },
        });
        const user = await tx.user.create({
          data: {
            company_id: company.id,
            first_name: input.firstName,
            last_name: input.lastName,
            email: input.email,
            password_hash: input.passwordHash,
          },
        });

        let ownerRoleId = '';
        for (const definition of SYSTEM_ROLES) {
          const role = await tx.role.create({
            data: {
              company_id: company.id,
              system_code: definition.code,
              name: definition.name,
              description: definition.description,
              is_system: true,
            },
          });
          if (definition.code === 'OWNER') ownerRoleId = role.id;
          const ids = ROLE_PERMISSION_MATRIX[definition.code].map((code) => {
            const id = permissionIds.get(code);
            if (!id) throw new Error(`Missing permission ${code}.`);
            return id;
          });
          if (ids.length) {
            await tx.role_permission.createMany({
              data: ids.map((permissionId) => ({
                role_id: role.id,
                permission_id: permissionId,
              })),
            });
          }
        }
        await tx.user_role.create({
          data: {
            user_id: user.id,
            role_id: ownerRoleId,
            company_id: company.id,
          },
        });
        return {
          userId: user.id,
          companyId: company.id,
          email: user.email,
          firstName: user.first_name,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe una cuenta con ese correo o CUIT.',
        );
      }
      throw error;
    }
  }
}
