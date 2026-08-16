import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';
import type { MercadoLibreOrderData } from '../client/mercadolibre-client.interface';

const orderSelect = {
  id: true,
  ml_order_id: true,
  status: true,
  total_amount: true,
  currency_id: true,
  buyer_nickname: true,
  date_created: true,
  date_closed: true,
  last_synced_at: true,
} satisfies Prisma.mercadolibre_orderSelect;

interface OrderFilters {
  status?: string;
  page: number;
  limit: number;
}

@Injectable()
export class MercadoLibreOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, filters: OrderFilters) {
    const where: Prisma.mercadolibre_orderWhereInput = {
      company_id: companyId,
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.mercadolibre_order.findMany({
        where,
        select: orderSelect,
        orderBy: [{ date_created: 'desc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.mercadolibre_order.count({ where }),
    ]);

    return { items, total };
  }

  async upsertMany(
    companyId: string,
    connectionId: string,
    orders: MercadoLibreOrderData[],
  ) {
    await this.prisma.$transaction(
      orders.map((order) =>
        this.prisma.mercadolibre_order.upsert({
          where: {
            connection_id_ml_order_id: {
              connection_id: connectionId,
              ml_order_id: order.orderId,
            },
          },
          create: {
            company_id: companyId,
            connection_id: connectionId,
            ml_order_id: order.orderId,
            status: order.status,
            total_amount: order.totalAmount,
            currency_id: order.currencyId,
            buyer_nickname: order.buyerNickname,
            date_created: order.dateCreated,
            date_closed: order.dateClosed,
          },
          update: {
            status: order.status,
            total_amount: order.totalAmount,
            currency_id: order.currencyId,
            buyer_nickname: order.buyerNickname,
            date_closed: order.dateClosed,
            last_synced_at: new Date(),
          },
        }),
      ),
    );
  }
}
