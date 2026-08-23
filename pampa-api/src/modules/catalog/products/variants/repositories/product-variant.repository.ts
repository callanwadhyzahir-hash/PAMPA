import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../../database/prisma.service';

const productVariantSelect = {
  id: true,
  product_id: true,
  label: true,
  sku_suffix: true,
  sort_order: true,
  is_active: true,
  created_at: true,
  updated_at: true,
} as const;

@Injectable()
export class ProductVariantRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProductRef(companyId: string, productId: string) {
    return this.prisma.product.findFirst({
      where: { id: productId, company_id: companyId },
      select: { id: true },
    });
  }

  findAll(companyId: string, productId: string) {
    return this.prisma.product_variant.findMany({
      where: { company_id: companyId, product_id: productId },
      select: productVariantSelect,
      orderBy: [{ is_active: 'desc' }, { sort_order: 'asc' }],
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.product_variant.findFirst({
      where: { id, company_id: companyId },
      select: productVariantSelect,
    });
  }

  findByLabel(
    companyId: string,
    productId: string,
    label: string,
    excludeId?: string,
  ) {
    return this.prisma.product_variant.findFirst({
      where: {
        company_id: companyId,
        product_id: productId,
        label: { equals: label, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  create(
    companyId: string,
    productId: string,
    data: { label: string; skuSuffix?: string; sortOrder: number },
  ) {
    return this.prisma.product_variant.create({
      data: {
        company_id: companyId,
        product_id: productId,
        label: data.label,
        sku_suffix: data.skuSuffix,
        sort_order: data.sortOrder,
      },
      select: productVariantSelect,
    });
  }

  async update(
    companyId: string,
    id: string,
    data: {
      label?: string;
      skuSuffix?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    const hasChanges =
      data.label !== undefined ||
      data.skuSuffix !== undefined ||
      data.sortOrder !== undefined ||
      data.isActive !== undefined;
    if (!hasChanges) {
      // Prisma's `updateMany` reports `count: 0` when every `data` field is
      // `undefined` — it never touches the WHERE clause — so an empty PATCH
      // would otherwise look like "not found" instead of a no-op.
      const exists = await this.prisma.product_variant.findFirst({
        where: { id, company_id: companyId },
        select: { id: true },
      });
      return exists ? this.findById(companyId, id) : null;
    }

    const result = await this.prisma.product_variant.updateMany({
      where: { id, company_id: companyId },
      data: {
        label: data.label,
        sku_suffix: data.skuSuffix,
        sort_order: data.sortOrder,
        is_active: data.isActive,
      },
    });
    return result.count === 1 ? this.findById(companyId, id) : null;
  }

  async deactivateOrDelete(companyId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.product_variant.findFirst({
        where: { id, company_id: companyId },
        select: { id: true },
      });
      if (!variant) return { status: 'NOT_FOUND' as const };

      const [stockWithQuantity, saleItemCount, catalogOrderItemCount] =
        await Promise.all([
          tx.stock.findFirst({
            where: { company_id: companyId, variant_id: id, quantity: { gt: 0 } },
            select: { id: true },
          }),
          tx.sale_item.count({
            where: { company_id: companyId, variant_id: id },
          }),
          tx.catalog_order_item.count({
            where: { company_id: companyId, variant_id: id },
          }),
        ]);
      const inUse =
        Boolean(stockWithQuantity) || saleItemCount > 0 || catalogOrderItemCount > 0;
      if (inUse) {
        await tx.product_variant.update({
          where: { id: variant.id },
          data: { is_active: false },
        });
        return { status: 'DEACTIVATED' as const };
      }

      await tx.stock.deleteMany({ where: { company_id: companyId, variant_id: id } });
      await tx.product_variant.delete({ where: { id: variant.id } });
      return { status: 'DELETED' as const };
    });
  }
}
