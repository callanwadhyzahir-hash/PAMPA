import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../database/prisma.service';

const productCategorySelect = {
  id: true,
  name: true,
  description: true,
  attribute_kind: true,
  is_active: true,
  created_at: true,
  updated_at: true,
  _count: { select: { product: true } },
  product_category_attribute_option: {
    select: { id: true, label: true, sort_order: true },
    orderBy: { sort_order: 'asc' as const },
  },
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
    data: {
      name: string;
      description?: string;
      isActive: boolean;
      attributeKind: string;
      attributeOptions?: string[];
    },
  ) {
    return this.prisma.product_category.create({
      data: {
        company_id: companyId,
        name: data.name,
        description: data.description,
        is_active: data.isActive,
        attribute_kind: data.attributeKind,
        product_category_attribute_option: data.attributeOptions?.length
          ? {
              create: data.attributeOptions.map((label, index) => ({
                label,
                sort_order: index,
              })),
            }
          : undefined,
      },
      select: productCategorySelect,
    });
  }

  async update(
    companyId: string,
    id: string,
    data: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
      attributeKind?: string;
      attributeOptions?: string[];
    },
  ) {
    const hasScalarChanges =
      data.name !== undefined ||
      data.description !== undefined ||
      data.isActive !== undefined ||
      data.attributeKind !== undefined;

    if (hasScalarChanges) {
      // Prisma's `updateMany` reports `count: 0` (not an error) when every
      // field in `data` resolves to `undefined` — it never touches the
      // WHERE clause. A caller that only sends `attributeOptions` hits that
      // case, so the scalar update only runs when something actually changed.
      const result = await this.prisma.product_category.updateMany({
        where: { id, company_id: companyId },
        data: {
          name: data.name,
          description: data.description,
          is_active: data.isActive,
          attribute_kind: data.attributeKind,
        },
      });
      if (result.count !== 1) return null;
    } else {
      const exists = await this.prisma.product_category.findFirst({
        where: { id, company_id: companyId },
        select: { id: true },
      });
      if (!exists) return null;
    }

    if (data.attributeOptions !== undefined) {
      await this.prisma.$transaction([
        this.prisma.product_category_attribute_option.deleteMany({
          where: { category_id: id },
        }),
        ...(data.attributeOptions.length
          ? [
              this.prisma.product_category_attribute_option.createMany({
                data: data.attributeOptions.map((label, index) => ({
                  category_id: id,
                  label,
                  sort_order: index,
                })),
              }),
            ]
          : []),
      ]);
    }

    return this.findById(companyId, id);
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
