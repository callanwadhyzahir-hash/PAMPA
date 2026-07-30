import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../database/prisma.service';

const productCategorySelect = {
  id: true,
  name: true,
  description: true,
  is_active: true,
  created_at: true,
  updated_at: true,
  _count: { select: { product: true } },
} as const;

@Injectable()
export class ProductCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string, search?: string) {
    return this.prisma.product_category.findMany({
      where: {
        company_id: companyId,
        ...(search
          ? { name: { contains: search, mode: 'insensitive' as const } }
          : {}),
      },
      select: productCategorySelect,
      orderBy: [{ is_active: 'desc' }, { name: 'asc' }],
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.product_category.findFirst({
      where: { id, company_id: companyId },
      select: productCategorySelect,
    });
  }

  findByName(companyId: string, name: string, excludeId?: string) {
    return this.prisma.product_category.findFirst({
      where: {
        company_id: companyId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  create(
    companyId: string,
    data: { name: string; description?: string; isActive: boolean },
  ) {
    return this.prisma.product_category.create({
      data: {
        company_id: companyId,
        name: data.name,
        description: data.description,
        is_active: data.isActive,
      },
      select: productCategorySelect,
    });
  }

  async update(
    companyId: string,
    id: string,
    data: { name?: string; description?: string | null; isActive?: boolean },
  ) {
    const result = await this.prisma.product_category.updateMany({
      where: { id, company_id: companyId },
      data: {
        name: data.name,
        description: data.description,
        is_active: data.isActive,
      },
    });
    return result.count === 1 ? this.findById(companyId, id) : null;
  }

  async deactivateOrDelete(companyId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.product_category.findFirst({
        where: { id, company_id: companyId },
        select: { id: true, _count: { select: { product: true } } },
      });
      if (!category) return { status: 'NOT_FOUND' as const };
      if (category._count.product > 0) {
        await tx.product_category.update({
          where: { id: category.id },
          data: { is_active: false },
        });
        return { status: 'DEACTIVATED' as const };
      }
      await tx.product_category.delete({ where: { id: category.id } });
      return { status: 'DELETED' as const };
    });
  }
}
