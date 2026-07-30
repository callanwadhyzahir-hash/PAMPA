import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { RbacRepository } from './rbac.repository';

@Injectable()
export class OwnerProtectionService {
  constructor(private readonly repository: RbacRepository) {}

  removeOwner(actorUserId: string, targetUserId: string, companyId: string) {
    return this.repository.executeOwnerMutation(companyId, async (tx) => {
      await this.assertActiveOwner(tx, actorUserId, companyId);
      if (actorUserId === targetUserId) {
        throw new ForbiddenException(
          'OWNER solo puede ser retirado por otro OWNER.',
        );
      }
      const target = await this.findTenantUser(tx, targetUserId, companyId);
      const ownerRole = await this.findOwnerRole(tx, companyId);

      const assignment = await tx.user_role.findUnique({
        where: {
          user_id_role_id: {
            user_id: target.id,
            role_id: ownerRole.id,
          },
        },
        select: { user_id: true },
      });
      if (!assignment) return false;

      if (target.is_active) {
        await this.assertAnotherActiveOwnerExists(tx, companyId, target.id);
      }

      await tx.user_role.delete({
        where: {
          user_id_role_id: {
            user_id: target.id,
            role_id: ownerRole.id,
          },
        },
      });
      return true;
    });
  }

  deactivateUser(actorUserId: string, targetUserId: string, companyId: string) {
    return this.repository.executeOwnerMutation(companyId, async (tx) => {
      const target = await this.findTenantUser(tx, targetUserId, companyId);
      const ownerRole = await this.findOwnerRole(tx, companyId);

      const isOwner = await tx.user_role.findUnique({
        where: {
          user_id_role_id: {
            user_id: target.id,
            role_id: ownerRole.id,
          },
        },
        select: { user_id: true },
      });

      if (isOwner && target.is_active) {
        await this.assertActiveOwner(tx, actorUserId, companyId);
        if (actorUserId === targetUserId) {
          throw new ForbiddenException(
            'Un OWNER no puede desactivarse a sí mismo.',
          );
        }
        await this.assertAnotherActiveOwnerExists(tx, companyId, target.id);
      }

      await tx.user.update({
        where: { id: target.id },
        data: { is_active: false },
        select: { id: true },
      });
    });
  }

  private async assertActiveOwner(
    tx: Prisma.TransactionClient,
    userId: string,
    companyId: string,
  ) {
    const assignment = await tx.user_role.findFirst({
      where: {
        user_id: userId,
        user: {
          company_id: companyId,
          is_active: true,
        },
        role: {
          company_id: companyId,
          system_code: 'OWNER',
          is_system: true,
          is_active: true,
        },
      },
      select: { user_id: true },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'Solo un OWNER activo de la empresa puede realizar esta operacion.',
      );
    }
  }

  private async findTenantUser(
    tx: Prisma.TransactionClient,
    userId: string,
    companyId: string,
  ) {
    const user = await tx.user.findFirst({
      where: { id: userId, company_id: companyId },
      select: { id: true, is_active: true },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado.');
    return user;
  }

  private async findOwnerRole(tx: Prisma.TransactionClient, companyId: string) {
    const role = await tx.role.findUnique({
      where: {
        company_id_system_code: {
          company_id: companyId,
          system_code: 'OWNER',
        },
      },
      select: { id: true },
    });

    if (!role) {
      throw new ConflictException('El rol OWNER no esta configurado.');
    }
    return role;
  }

  private async assertAnotherActiveOwnerExists(
    tx: Prisma.TransactionClient,
    companyId: string,
    excludedUserId: string,
  ) {
    const anotherOwner = await tx.user_role.findFirst({
      where: {
        user_id: { not: excludedUserId },
        user: {
          company_id: companyId,
          is_active: true,
        },
        role: {
          company_id: companyId,
          system_code: 'OWNER',
          is_system: true,
          is_active: true,
        },
      },
      select: { user_id: true },
    });

    if (!anotherOwner) {
      throw new ConflictException(
        'La empresa debe conservar al menos un OWNER activo.',
      );
    }
  }
}
