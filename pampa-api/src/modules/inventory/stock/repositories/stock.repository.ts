import { Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';

export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const stockSelect = {
  id: true,
  product_id: true,
  variant_id: true,
  warehouse_id: true,
  quantity: true,
  minimum_quantity: true,
  maximum_quantity: true,
  updated_at: true,
  product: {
    select: {
      id: true,
      code: true,
      barcode: true,
      name: true,
      unit: true,
      tracks_stock: true,
      is_active: true,
      image_url: true,
    },
  },
  product_variant: {
    select: { id: true, label: true },
  },
  warehouse: {
    select: {
      id: true,
      code: true,
      name: true,
      branch_id: true,
      is_active: true,
      branch: { select: { id: true, name: true, code: true } },
    },
  },
} satisfies Prisma.stockSelect;

const movementSelect = {
  id: true,
  product_id: true,
  variant_id: true,
  warehouse_id: true,
  movement_type: true,
  quantity: true,
  reference_id: true,
  reference_code: true,
  origin: true,
  observations: true,
  created_at: true,
  product: {
    select: { id: true, code: true, name: true, unit: true, image_url: true },
  },
  product_variant: {
    select: { id: true, label: true },
  },
  warehouse: { select: { id: true, code: true, name: true } },
  user: { select: { id: true, first_name: true, last_name: true } },
} satisfies Prisma.stock_movementSelect;

@Injectable()
export class StockRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(
    companyId: string,
    filters?: {
      productId?: string;
      variantId?: string;
      warehouseId?: string;
      lowStock?: boolean;
    },
  ) {
    return this.prisma.stock.findMany({
      where: {
        company_id: companyId,
        ...(filters?.productId ? { product_id: filters.productId } : {}),
        ...(filters?.variantId ? { variant_id: filters.variantId } : {}),
        ...(filters?.warehouseId ? { warehouse_id: filters.warehouseId } : {}),
        ...(filters?.lowStock
          ? { quantity: { lte: this.prisma.stock.fields.minimum_quantity } }
          : {}),
      },
      select: stockSelect,
      orderBy: [{ product: { name: 'asc' } }, { warehouse: { name: 'asc' } }],
    });
  }

  async summary(companyId: string) {
    const rows = await this.prisma.stock.findMany({
      where: { company_id: companyId },
      select: {
        quantity: true,
        minimum_quantity: true,
        product_id: true,
        warehouse_id: true,
      },
    });
    return {
      positions: rows.length,
      products: new Set(rows.map((row) => row.product_id)).size,
      warehouses: new Set(rows.map((row) => row.warehouse_id)).size,
      units: rows.reduce(
        (total, row) => total.plus(row.quantity),
        new Prisma.Decimal(0),
      ),
      lowStock: rows.filter((row) =>
        row.quantity.lessThanOrEqualTo(row.minimum_quantity),
      ).length,
      outOfStock: rows.filter((row) => row.quantity.isZero()).length,
    };
  }

  findMovements(
    companyId: string,
    filters?: { productId?: string; variantId?: string; warehouseId?: string },
  ) {
    return this.prisma.stock_movement.findMany({
      where: {
        company_id: companyId,
        ...(filters?.productId ? { product_id: filters.productId } : {}),
        ...(filters?.variantId ? { variant_id: filters.variantId } : {}),
        ...(filters?.warehouseId ? { warehouse_id: filters.warehouseId } : {}),
      },
      select: movementSelect,
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  findMovement(companyId: string, id: string) {
    return this.prisma.stock_movement.findFirst({
      where: { id, company_id: companyId },
      select: movementSelect,
    });
  }

  transaction<T>(work: (tx: TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(work, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  findActiveProduct(tx: TransactionClient, companyId: string, id: string) {
    return tx.product.findFirst({
      where: {
        id,
        company_id: companyId,
        is_active: true,
        tracks_stock: true,
      },
      select: { id: true },
    });
  }

  findActiveWarehouse(tx: TransactionClient, companyId: string, id: string) {
    return tx.warehouse.findFirst({
      where: { id, company_id: companyId, is_active: true },
      select: { id: true },
    });
  }

  findActiveVariant(
    tx: TransactionClient,
    companyId: string,
    productId: string,
    variantId: string,
  ) {
    return tx.product_variant.findFirst({
      where: {
        id: variantId,
        product_id: productId,
        company_id: companyId,
        is_active: true,
      },
      select: { id: true },
    });
  }

  lockStock(
    tx: TransactionClient,
    companyId: string,
    warehouseId: string,
    productId: string,
    variantId?: string,
  ) {
    const key = `${companyId}:${warehouseId}:${productId}:${variantId ?? 'null'}`;
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }

  async upsertStock(
    tx: TransactionClient,
    companyId: string,
    warehouseId: string,
    productId: string,
    variantId?: string,
  ) {
    if (variantId) {
      return tx.stock.upsert({
        where: {
          warehouse_id_product_id_variant_id: {
            warehouse_id: warehouseId,
            product_id: productId,
            variant_id: variantId,
          },
        },
        create: {
          company_id: companyId,
          warehouse_id: warehouseId,
          product_id: productId,
          variant_id: variantId,
          quantity: 0,
        },
        update: {},
        select: { id: true, quantity: true },
      });
    }

    // Prisma's generated compound-unique input for warehouse_id_product_id_variant_id
    // cannot take `null` for variant_id, so the no-variant case is resolved with a
    // plain find-then-create instead of `upsert`. Callers already serialize concurrent
    // writes via `lockStock`'s advisory lock, so this stays race-free.
    const existing = await tx.stock.findFirst({
      where: { warehouse_id: warehouseId, product_id: productId, variant_id: null },
      select: { id: true, quantity: true },
    });
    if (existing) {
      return existing;
    }

    return tx.stock.create({
      data: {
        company_id: companyId,
        warehouse_id: warehouseId,
        product_id: productId,
        quantity: 0,
      },
      select: { id: true, quantity: true },
    });
  }

  updateQuantity(tx: TransactionClient, id: string, quantity: Prisma.Decimal) {
    return tx.stock.update({
      where: { id },
      data: { quantity },
      select: stockSelect,
    });
  }

  createMovement(
    tx: TransactionClient,
    data: {
      companyId: string;
      productId: string;
      variantId?: string;
      warehouseId: string;
      movementType: string;
      quantity: Prisma.Decimal;
      referenceCode: string;
      origin: string;
      observations: string;
      actorUserId: string;
    },
  ) {
    return tx.stock_movement.create({
      data: {
        company_id: data.companyId,
        product_id: data.productId,
        variant_id: data.variantId,
        warehouse_id: data.warehouseId,
        movement_type: data.movementType,
        quantity: data.quantity,
        reference_code: data.referenceCode,
        origin: data.origin,
        observations: data.observations,
        created_by: data.actorUserId,
      },
      select: movementSelect,
    });
  }
}
