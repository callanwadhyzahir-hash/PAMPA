import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import type { TransactionClient } from '../../inventory/stock/repositories/stock.repository';

interface PublicProductFilters {
  search?: string;
  categoryId?: string;
  page: number;
  limit: number;
}

function publicProductSelect(warehouseId: string) {
  return {
    id: true,
    name: true,
    description: true,
    sale_price: true,
    tax_rate: true,
    unit: true,
    tracks_stock: true,
    image_url: true,
    catalog_featured: true,
    catalog_position: true,
    product_category: { select: { id: true, name: true } },
    stock: {
      where: { warehouse_id: warehouseId },
      select: { quantity: true, minimum_quantity: true },
      take: 1,
    },
  } satisfies Prisma.productSelect;
}

@Injectable()
export class StorefrontRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findProducts(
    companyId: string,
    warehouseId: string,
    filters: PublicProductFilters,
  ) {
    const where: Prisma.productWhereInput = {
      company_id: companyId,
      is_active: true,
      catalog_visible: true,
      ...(filters.categoryId ? { category_id: filters.categoryId } : {}),
      ...(filters.search
        ? { name: { contains: filters.search, mode: 'insensitive' } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: publicProductSelect(warehouseId),
        orderBy: [
          { catalog_featured: 'desc' },
          { catalog_position: 'asc' },
          { name: 'asc' },
        ],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total };
  }

  findProduct(companyId: string, warehouseId: string, productId: string) {
    return this.prisma.product.findFirst({
      where: {
        id: productId,
        company_id: companyId,
        is_active: true,
        catalog_visible: true,
      },
      select: publicProductSelect(warehouseId),
    });
  }

  findCategories(companyId: string) {
    return this.prisma.product_category.findMany({
      where: {
        company_id: companyId,
        is_active: true,
        product: { some: { is_active: true, catalog_visible: true } },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  findOrderableProducts(
    tx: TransactionClient,
    companyId: string,
    ids: string[],
  ) {
    return tx.product.findMany({
      where: {
        id: { in: ids },
        company_id: companyId,
        is_active: true,
        catalog_visible: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        sale_price: true,
        tax_rate: true,
        unit: true,
      },
    });
  }

  createOrder(
    tx: TransactionClient,
    data: {
      companyId: string;
      catalogId: string;
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      notes?: string;
      requesterIpHash?: string;
      subtotal: Prisma.Decimal;
      total: Prisma.Decimal;
      items: Array<{
        productId: string;
        lineNumber: number;
        productName: string;
        productCode: string;
        quantity: Prisma.Decimal;
        unitPrice: Prisma.Decimal;
        subtotal: Prisma.Decimal;
      }>;
    },
  ) {
    return tx.catalog_order.create({
      data: {
        company_id: data.companyId,
        catalog_id: data.catalogId,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_email: data.customerEmail,
        notes: data.notes,
        requester_ip_hash: data.requesterIpHash,
        subtotal: data.subtotal,
        total: data.total,
        catalog_order_item: {
          create: data.items.map((item) => ({
            line_number: item.lineNumber,
            product_name: item.productName,
            product_code: item.productCode,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            subtotal: item.subtotal,
            product: {
              connect: {
                id_company_id: {
                  id: item.productId,
                  company_id: data.companyId,
                },
              },
            },
          })),
        },
      },
      select: {
        id: true,
        order_number: true,
        status: true,
        subtotal: true,
        total: true,
        created_at: true,
        catalog_order_item: {
          select: {
            product_name: true,
            quantity: true,
            unit_price: true,
            subtotal: true,
          },
        },
      },
    });
  }
}
