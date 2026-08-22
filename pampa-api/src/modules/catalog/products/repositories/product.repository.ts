import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';

const productSelect = {
  id: true,
  category_id: true,
  code: true,
  barcode: true,
  name: true,
  description: true,
  product_type: true,
  unit: true,
  cost: true,
  sale_price: true,
  tax_rate: true,
  tracks_stock: true,
  is_active: true,
  image_url: true,
  catalog_visible: true,
  catalog_featured: true,
  catalog_position: true,
  created_at: true,
  updated_at: true,
  product_category: {
    select: { id: true, name: true, is_active: true },
  },
  company: {
    select: {
      currency: { select: { id: true, code: true, name: true, symbol: true } },
    },
  },
  stock: {
    select: {
      id: true,
      warehouse_id: true,
      quantity: true,
      minimum_quantity: true,
      maximum_quantity: true,
      warehouse: {
        select: { id: true, name: true, code: true, is_active: true },
      },
    },
  },
} satisfies Prisma.productSelect;

interface ProductFilters {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  page: number;
  limit: number;
}

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, filters: ProductFilters) {
    const where: Prisma.productWhereInput = {
      company_id: companyId,
      ...(filters.categoryId ? { category_id: filters.categoryId } : {}),
      ...(filters.isActive === undefined
        ? {}
        : { is_active: filters.isActive }),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { code: { contains: filters.search, mode: 'insensitive' } },
              { barcode: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: productSelect,
        orderBy: [{ is_active: 'desc' }, { name: 'asc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total };
  }

  findById(companyId: string, id: string) {
    return this.prisma.product.findFirst({
      where: { id, company_id: companyId },
      select: productSelect,
    });
  }

  findByBarcode(companyId: string, barcode: string) {
    return this.prisma.product.findFirst({
      where: { company_id: companyId, barcode },
      select: productSelect,
    });
  }

  existsByBarcode(companyId: string, barcode: string) {
    return this.prisma.product
      .findFirst({
        where: { company_id: companyId, barcode },
        select: { id: true },
      })
      .then((product) => product !== null);
  }

  findByCodeOrBarcode(
    companyId: string,
    code?: string,
    barcode?: string,
    excludeId?: string,
  ) {
    return this.prisma.product.findFirst({
      where: {
        company_id: companyId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        OR: [
          ...(code
            ? [{ code: { equals: code, mode: 'insensitive' as const } }]
            : []),
          ...(barcode ? [{ barcode }] : []),
        ],
      },
      select: { id: true, code: true, barcode: true },
    });
  }

  findActiveCategory(companyId: string, id: string) {
    return this.prisma.product_category.findFirst({
      where: { id, company_id: companyId, is_active: true },
      select: { id: true },
    });
  }

  create(
    companyId: string,
    data: {
      categoryId?: string;
      code: string;
      barcode?: string;
      name: string;
      description?: string;
      productType: string;
      unit: string;
      cost: Prisma.Decimal;
      salePrice: Prisma.Decimal;
      taxRate: Prisma.Decimal;
      tracksStock: boolean;
      isActive: boolean;
      catalogVisible?: boolean;
      catalogFeatured?: boolean;
      catalogPosition?: number;
    },
  ) {
    return this.prisma.product.create({
      data: {
        company_id: companyId,
        category_id: data.categoryId,
        code: data.code,
        barcode: data.barcode,
        name: data.name,
        description: data.description,
        product_type: data.productType,
        unit: data.unit,
        cost: data.cost,
        sale_price: data.salePrice,
        tax_rate: data.taxRate,
        tracks_stock: data.tracksStock,
        is_active: data.isActive,
        catalog_visible: data.catalogVisible ?? false,
        catalog_featured: data.catalogFeatured ?? false,
        catalog_position: data.catalogPosition ?? 0,
      },
      select: productSelect,
    });
  }

  async update(
    companyId: string,
    id: string,
    data: {
      categoryId?: string | null;
      code?: string;
      barcode?: string | null;
      name?: string;
      description?: string | null;
      productType?: string;
      unit?: string;
      cost?: Prisma.Decimal;
      salePrice?: Prisma.Decimal;
      taxRate?: Prisma.Decimal;
      tracksStock?: boolean;
      isActive?: boolean;
      catalogVisible?: boolean;
      catalogFeatured?: boolean;
      catalogPosition?: number;
    },
  ) {
    const result = await this.prisma.product.updateMany({
      where: { id, company_id: companyId },
      data: {
        category_id: data.categoryId,
        code: data.code,
        barcode: data.barcode,
        name: data.name,
        description: data.description,
        product_type: data.productType,
        unit: data.unit,
        cost: data.cost,
        sale_price: data.salePrice,
        tax_rate: data.taxRate,
        tracks_stock: data.tracksStock,
        is_active: data.isActive,
        catalog_visible: data.catalogVisible,
        catalog_featured: data.catalogFeatured,
        catalog_position: data.catalogPosition,
      },
    });
    return result.count === 1 ? this.findById(companyId, id) : null;
  }

  deactivate(companyId: string, id: string) {
    return this.update(companyId, id, { isActive: false });
  }

  async setCatalogVisibility(
    companyId: string,
    ids: string[],
    visible: boolean,
  ) {
    const result = await this.prisma.product.updateMany({
      where: { id: { in: ids }, company_id: companyId },
      data: { catalog_visible: visible },
    });
    return result.count;
  }

  findStock(companyId: string, productId: string) {
    return this.prisma.stock.findMany({
      where: {
        product_id: productId,
        product: { company_id: companyId },
        warehouse: { company_id: companyId },
      },
      select: {
        id: true,
        quantity: true,
        minimum_quantity: true,
        maximum_quantity: true,
        warehouse: {
          select: { id: true, name: true, code: true, is_active: true },
        },
      },
      orderBy: { warehouse: { name: 'asc' } },
    });
  }

  findImageMeta(companyId: string, id: string) {
    return this.prisma.product.findFirst({
      where: { id, company_id: companyId },
      select: { id: true, image_pathname: true },
    });
  }

  async setImage(
    companyId: string,
    id: string,
    data: { imageUrl: string; imagePathname: string },
  ) {
    const result = await this.prisma.product.updateMany({
      where: { id, company_id: companyId },
      data: { image_url: data.imageUrl, image_pathname: data.imagePathname },
    });
    return result.count === 1
      ? this.prisma.product.findFirst({
          where: { id, company_id: companyId },
          select: { id: true, image_url: true },
        })
      : null;
  }

  async clearImage(companyId: string, id: string) {
    const result = await this.prisma.product.updateMany({
      where: { id, company_id: companyId },
      data: { image_url: null, image_pathname: null },
    });
    return result.count === 1;
  }

  findMovements(companyId: string, productId: string) {
    return this.prisma.stock_movement.findMany({
      where: {
        product_id: productId,
        product: { company_id: companyId },
        warehouse: { company_id: companyId },
      },
      select: {
        id: true,
        movement_type: true,
        quantity: true,
        reference_id: true,
        observations: true,
        created_at: true,
        warehouse: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, first_name: true, last_name: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }
}
