import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';

const warehouseSelect = {
  id: true,
  branch_id: true,
  name: true,
  code: true,
  description: true,
  is_main: true,
  is_active: true,
  created_at: true,
  updated_at: true,
  branch: {
    select: { id: true, name: true, code: true, is_active: true },
  },
  stock: {
    select: { quantity: true, product_id: true },
  },
  _count: { select: { stock_movement: true } },
} satisfies Prisma.warehouseSelect;

@Injectable()
export class WarehouseRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string, branchId?: string) {
    return this.prisma.warehouse.findMany({
      where: {
        company_id: companyId,
        ...(branchId ? { branch_id: branchId } : {}),
      },
      select: warehouseSelect,
      orderBy: [{ is_active: 'desc' }, { is_main: 'desc' }, { name: 'asc' }],
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.warehouse.findFirst({
      where: { id, company_id: companyId },
      select: warehouseSelect,
    });
  }

  findActiveBranch(companyId: string, branchId: string) {
    return this.prisma.branch.findFirst({
      where: { id: branchId, company_id: companyId, is_active: true },
      select: { id: true },
    });
  }

  findByCode(companyId: string, code: string, excludeId?: string) {
    return this.prisma.warehouse.findFirst({
      where: {
        company_id: companyId,
        code: { equals: code, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  findActiveMain(branchId: string, excludeId?: string) {
    return this.prisma.warehouse.findFirst({
      where: {
        branch_id: branchId,
        is_main: true,
        is_active: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  create(
    companyId: string,
    data: {
      branchId: string;
      name: string;
      code: string;
      description?: string;
      isMain: boolean;
    },
  ) {
    return this.prisma.warehouse.create({
      data: {
        company_id: companyId,
        branch_id: data.branchId,
        name: data.name,
        code: data.code,
        description: data.description,
        is_main: data.isMain,
      },
      select: warehouseSelect,
    });
  }

  async update(
    companyId: string,
    id: string,
    data: {
      branchId?: string;
      name?: string;
      code?: string;
      description?: string | null;
      isMain?: boolean;
      isActive?: boolean;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.warehouse.findFirst({
        where: { id, company_id: companyId },
        select: { id: true, branch_id: true },
      });
      if (!current) return null;
      const branchId = data.branchId ?? current.branch_id;
      if (data.isMain === true) {
        await tx.warehouse.updateMany({
          where: {
            company_id: companyId,
            branch_id: branchId,
            id: { not: id },
            is_main: true,
          },
          data: { is_main: false },
        });
      }
      await tx.warehouse.update({
        where: { id },
        data: {
          branch_id: data.branchId,
          name: data.name,
          code: data.code,
          description: data.description,
          is_main: data.isMain,
          is_active: data.isActive,
        },
      });
      return tx.warehouse.findFirst({
        where: { id, company_id: companyId },
        select: warehouseSelect,
      });
    });
  }

  async deactivate(companyId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.findFirst({
        where: { id, company_id: companyId },
        select: {
          id: true,
          is_main: true,
          stock: { where: { quantity: { gt: 0 } }, select: { id: true } },
        },
      });
      if (!warehouse) return { status: 'NOT_FOUND' as const };
      if (warehouse.stock.length > 0) return { status: 'HAS_STOCK' as const };
      await tx.warehouse.update({
        where: { id },
        data: { is_active: false, is_main: false },
      });
      return { status: 'DEACTIVATED' as const };
    });
  }
}
