import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

/** A sale counts as real revenue once confirmed — same status filter AnalyticsRepository.dashboard()/reports() already use, kept in sync deliberately rather than imported, since these queries return a different (minimal) shape for tool consumption. */
const COUNTED_SALE_STATUSES: Prisma.saleWhereInput['status'] = {
  notIn: ['DRAFT', 'CANCELLED'],
};

@Injectable()
export class AiToolsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async salesSummary(companyId: string, from: Date, to: Date) {
    const [current, previous] = await Promise.all([
      this.prisma.sale.aggregate({
        where: {
          company_id: companyId,
          status: COUNTED_SALE_STATUSES,
          sale_date: { gte: from, lt: to },
        },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.sale.aggregate({
        where: {
          company_id: companyId,
          status: COUNTED_SALE_STATUSES,
          sale_date: {
            gte: new Date(from.getTime() - (to.getTime() - from.getTime())),
            lt: from,
          },
        },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    return {
      totalRevenue: (current._sum.total ?? new Prisma.Decimal(0)).toNumber(),
      salesCount: current._count,
      averageTicket:
        current._count > 0
          ? (current._sum.total ?? new Prisma.Decimal(0))
              .div(current._count)
              .toNumber()
          : 0,
      previousPeriodRevenue: (
        previous._sum.total ?? new Prisma.Decimal(0)
      ).toNumber(),
      previousPeriodSalesCount: previous._count,
    };
  }

  async topSellingProducts(
    companyId: string,
    from: Date,
    to: Date,
    limit: number,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        productName: string;
        quantity: Prisma.Decimal;
        total: Prisma.Decimal;
      }>
    >`
      SELECT si."product_name" AS "productName",
             SUM(si."quantity") AS "quantity",
             SUM(si."total") AS "total"
      FROM "sale_item" si
      JOIN "sale" s ON s."id" = si."sale_id"
      WHERE s."company_id" = ${companyId}::uuid
        AND s."status" NOT IN ('DRAFT', 'CANCELLED')
        AND s."sale_date" >= ${from} AND s."sale_date" < ${to}
      GROUP BY si."product_name"
      ORDER BY "total" DESC
      LIMIT ${limit}
    `;
    return rows.map((row) => ({
      productName: row.productName,
      unitsSold: Number(row.quantity),
      revenue: Number(row.total),
    }));
  }

  /** Uses client.current_balance — a real, actively-maintained field (recalculated by PaymentRepository.recalculateClientBalance on every payment mutation), not a value computed ad hoc for this tool. */
  async customerBalanceSummary(companyId: string, limit: number) {
    const where: Prisma.clientWhereInput = {
      company_id: companyId,
      is_active: true,
      current_balance: { gt: 0 },
    };

    const [aggregate, topDebtors, clientsWithBalance] = await Promise.all([
      this.prisma.client.aggregate({ where, _sum: { current_balance: true } }),
      this.prisma.client.findMany({
        where,
        orderBy: { current_balance: 'desc' },
        take: limit,
        select: {
          business_name: true,
          first_name: true,
          last_name: true,
          current_balance: true,
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      totalReceivable: (
        aggregate._sum.current_balance ?? new Prisma.Decimal(0)
      ).toNumber(),
      clientsWithBalance,
      topDebtors: topDebtors.map((client) => ({
        clientName:
          client.business_name ||
          `${client.first_name} ${client.last_name}`.trim(),
        balance: client.current_balance.toNumber(),
      })),
    };
  }
}
