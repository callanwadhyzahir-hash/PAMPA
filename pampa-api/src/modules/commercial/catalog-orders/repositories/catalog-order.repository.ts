import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';
import type { TransactionClient } from '../../../inventory/stock/repositories/stock.repository';

const orderSummarySelect = {
  id: true,
  order_number: true,
  status: true,
  customer_name: true,
  customer_phone: true,
  total: true,
  created_at: true,
  accepted_at: true,
  rejected_at: true,
  sale_id: true,
  _count: { select: { catalog_order_item: true } },
} satisfies Prisma.catalog_orderSelect;

const orderDetailSelect = {
  id: true,
  order_number: true,
  status: true,
  customer_name: true,
  customer_phone: true,
  customer_email: true,
  notes: true,
  subtotal: true,
  total: true,
  created_at: true,
  accepted_at: true,
  rejected_at: true,
  rejection_reason: true,
  client_id: true,
  sale_id: true,
  catalog: {
    select: {
      id: true,
      display_name: true,
      slug: true,
      branch_id: true,
      warehouse_id: true,
    },
  },
  client: {
    select: { id: true, code: true, first_name: true, last_name: true },
  },
  sale: {
    select: {
      id: true,
      sale_number: true,
      status: true,
      total: true,
      confirmed_at: true,
    },
  },
  catalog_order_item: {
    orderBy: { line_number: 'asc' as const },
    select: {
      id: true,
      product_id: true,
      variant_id: true,
      product_name: true,
      product_code: true,
      variant_label: true,
      quantity: true,
      unit_price: true,
      subtotal: true,
      product: { select: { id: true, image_url: true, is_active: true } },
    },
  },
} satisfies Prisma.catalog_orderSelect;

@Injectable()
export class CatalogOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string, status?: string) {
    return this.prisma.catalog_order.findMany({
      where: { company_id: companyId, ...(status ? { status } : {}) },
      select: orderSummarySelect,
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.catalog_order.findFirst({
      where: { id, company_id: companyId },
      select: orderDetailSelect,
    });
  }

  findByIdTx(tx: TransactionClient, companyId: string, id: string) {
    return tx.catalog_order.findFirst({
      where: { id, company_id: companyId },
      select: orderDetailSelect,
    });
  }

  async claimForAccept(tx: TransactionClient, companyId: string, id: string) {
    const result = await tx.catalog_order.updateMany({
      where: { id, company_id: companyId, status: 'PENDING' },
      data: { status: 'ACCEPTED', accepted_at: new Date() },
    });
    return result.count === 1;
  }

  linkAcceptedSale(
    tx: TransactionClient,
    id: string,
    data: { clientId?: string; saleId: string },
  ) {
    return tx.catalog_order.update({
      where: { id },
      data: { client_id: data.clientId, sale_id: data.saleId },
    });
  }

  async claimForReject(
    tx: TransactionClient,
    companyId: string,
    id: string,
    reason: string,
  ) {
    const result = await tx.catalog_order.updateMany({
      where: { id, company_id: companyId, status: 'PENDING' },
      data: {
        status: 'REJECTED',
        rejected_at: new Date(),
        rejection_reason: reason,
      },
    });
    return result.count === 1;
  }
}
