import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(companyId: string, from: Date, branchId?: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const saleWhere: Prisma.saleWhereInput = {
      company_id: companyId,
      status: { notIn: ['DRAFT', 'CANCELLED'] },
      ...(branchId ? { branch_id: branchId } : {}),
    };
    const [
      todaySales,
      monthSales,
      periodSales,
      collected,
      activeClients,
      activeBranches,
      lowStock,
      outOfStock,
      recentSales,
      recentMovements,
    ] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { ...saleWhere, sale_date: { gte: today } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.sale.aggregate({
        where: { ...saleWhere, sale_date: { gte: month } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.sale.aggregate({
        where: { ...saleWhere, sale_date: { gte: from } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: {
          company_id: companyId,
          status: 'COMPLETED',
          payment_date: { gte: from },
          ...(branchId ? { sale: { branch_id: branchId } } : {}),
        },
        _sum: { total: true },
      }),
      this.prisma.client.count({
        where: { company_id: companyId, is_active: true },
      }),
      this.prisma.branch.count({
        where: { company_id: companyId, is_active: true },
      }),
      this.prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS "count"
        FROM "stock" s
        JOIN "warehouse" w ON w."id" = s."warehouse_id"
        WHERE s."company_id" = ${companyId}::uuid
          AND s."quantity" <= s."minimum_quantity"
          AND (${branchId ?? null}::uuid IS NULL OR w."branch_id" = ${branchId ?? null}::uuid)
      `,
      this.prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS "count"
        FROM "stock" s
        JOIN "warehouse" w ON w."id" = s."warehouse_id"
        WHERE s."company_id" = ${companyId}::uuid
          AND s."quantity" = 0
          AND (${branchId ?? null}::uuid IS NULL OR w."branch_id" = ${branchId ?? null}::uuid)
      `,
      this.prisma.sale.findMany({
        where: saleWhere,
        select: {
          id: true,
          sale_number: true,
          sale_date: true,
          total: true,
          status: true,
          client: {
            select: {
              first_name: true,
              last_name: true,
              business_name: true,
            },
          },
        },
        orderBy: { sale_date: 'desc' },
        take: 5,
      }),
      this.prisma.stock_movement.findMany({
        where: {
          company_id: companyId,
          ...(branchId ? { warehouse: { branch_id: branchId } } : {}),
        },
        select: {
          id: true,
          movement_type: true,
          quantity: true,
          created_at: true,
          product: { select: { name: true, code: true } },
          warehouse: { select: { name: true, code: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
    ]);
    return {
      salesToday: todaySales._sum.total ?? new Prisma.Decimal(0),
      salesMonth: monthSales._sum.total ?? new Prisma.Decimal(0),
      salesCount: periodSales._count,
      salesPeriod: periodSales._sum.total ?? new Prisma.Decimal(0),
      collected: collected._sum.total ?? new Prisma.Decimal(0),
      pending: (periodSales._sum.total ?? new Prisma.Decimal(0)).minus(
        collected._sum.total ?? new Prisma.Decimal(0),
      ),
      activeClients,
      activeBranches,
      lowStock: lowStock[0]?.count ?? 0,
      outOfStock: outOfStock[0]?.count ?? 0,
      recentSales,
      recentMovements,
    };
  }

  reports(companyId: string, from: Date, to: Date, branchId?: string) {
    return Promise.all([
      this.prisma.$queryRaw`
        SELECT s."sale_date"::date AS "date", COUNT(*)::int AS "count",
               SUM(s."total") AS "total"
        FROM "sale" s
        WHERE s."company_id" = ${companyId}::uuid
          AND s."status" NOT IN ('DRAFT', 'CANCELLED')
          AND s."sale_date" >= ${from} AND s."sale_date" < ${to}
          AND (${branchId ?? null}::uuid IS NULL OR s."branch_id" = ${branchId ?? null}::uuid)
        GROUP BY s."sale_date"::date ORDER BY "date"
        LIMIT 366
      `,
      this.prisma.$queryRaw`
        SELECT b."id", b."name", COUNT(s."id")::int AS "count",
               COALESCE(SUM(s."total"), 0) AS "total"
        FROM "branch" b
        LEFT JOIN "sale" s ON s."branch_id" = b."id"
          AND s."status" NOT IN ('DRAFT', 'CANCELLED')
          AND s."sale_date" >= ${from} AND s."sale_date" < ${to}
        WHERE b."company_id" = ${companyId}::uuid
          AND (${branchId ?? null}::uuid IS NULL OR b."id" = ${branchId ?? null}::uuid)
        GROUP BY b."id", b."name" ORDER BY "total" DESC
        LIMIT 100
      `,
      this.prisma.$queryRaw`
        SELECT si."product_id" AS "productId", si."product_name" AS "productName",
               SUM(si."quantity") AS "quantity", SUM(si."total") AS "total"
        FROM "sale_item" si JOIN "sale" s ON s."id" = si."sale_id"
        WHERE s."company_id" = ${companyId}::uuid
          AND s."status" NOT IN ('DRAFT', 'CANCELLED')
          AND s."sale_date" >= ${from} AND s."sale_date" < ${to}
          AND (${branchId ?? null}::uuid IS NULL OR s."branch_id" = ${branchId ?? null}::uuid)
        GROUP BY si."product_id", si."product_name" ORDER BY "total" DESC
        LIMIT 500
      `,
      this.prisma.$queryRaw`
        SELECT pi."payment_method" AS "method", SUM(pi."amount") AS "total"
        FROM "payment_item" pi JOIN "payment" p ON p."id" = pi."payment_id"
        JOIN "sale" s ON s."id" = p."sale_id"
        WHERE p."company_id" = ${companyId}::uuid AND p."status" = 'COMPLETED'
          AND p."payment_date" >= ${from} AND p."payment_date" < ${to}
          AND (${branchId ?? null}::uuid IS NULL OR s."branch_id" = ${branchId ?? null}::uuid)
        GROUP BY pi."payment_method" ORDER BY "total" DESC
        LIMIT 20
      `,
      this.prisma.$queryRaw`
        SELECT COALESCE(c."business_name",
          NULLIF(CONCAT_WS(' ', c."first_name", c."last_name"), ''),
          'Consumidor final') AS "clientName",
          COUNT(s."id")::int AS "count", SUM(s."total") AS "total"
        FROM "sale" s LEFT JOIN "client" c ON c."id" = s."client_id"
        WHERE s."company_id" = ${companyId}::uuid
          AND s."status" NOT IN ('DRAFT', 'CANCELLED')
          AND s."sale_date" >= ${from} AND s."sale_date" < ${to}
          AND (${branchId ?? null}::uuid IS NULL OR s."branch_id" = ${branchId ?? null}::uuid)
        GROUP BY c."id", c."business_name", c."first_name", c."last_name"
        ORDER BY "total" DESC LIMIT 500
      `,
      this.prisma.$queryRaw`
        SELECT sm."created_at" AS "date", sm."movement_type" AS "type",
          sm."quantity", sm."reference_code" AS "reference",
          p."code" AS "productCode", p."name" AS "productName",
          w."name" AS "warehouseName"
        FROM "stock_movement" sm
        JOIN "product" p ON p."id" = sm."product_id"
        JOIN "warehouse" w ON w."id" = sm."warehouse_id"
        WHERE sm."company_id" = ${companyId}::uuid
          AND sm."created_at" >= ${from} AND sm."created_at" < ${to}
          AND (${branchId ?? null}::uuid IS NULL OR w."branch_id" = ${branchId ?? null}::uuid)
        ORDER BY sm."created_at" DESC LIMIT 1000
      `,
      this.prisma.$queryRaw`
        SELECT s."id", s."sale_number"::text AS "saleNumber",
          s."sale_date" AS "date", s."total",
          s."total" - COALESCE(SUM(p."total")
            FILTER (WHERE p."status" = 'COMPLETED'), 0) AS "balance",
          COALESCE(c."business_name",
            NULLIF(CONCAT_WS(' ', c."first_name", c."last_name"), ''),
            'Consumidor final') AS "clientName"
        FROM "sale" s LEFT JOIN "client" c ON c."id" = s."client_id"
        LEFT JOIN "payment" p ON p."sale_id" = s."id"
        WHERE s."company_id" = ${companyId}::uuid
          AND s."status" IN ('CONFIRMED', 'PARTIALLY_PAID')
          AND (${branchId ?? null}::uuid IS NULL OR s."branch_id" = ${branchId ?? null}::uuid)
        GROUP BY s."id", c."id", c."business_name", c."first_name", c."last_name"
        HAVING s."total" - COALESCE(SUM(p."total")
          FILTER (WHERE p."status" = 'COMPLETED'), 0) > 0
        ORDER BY s."sale_date" DESC LIMIT 500
      `,
      this.prisma.stock.findMany({
        where: {
          company_id: companyId,
          ...(branchId ? { warehouse: { branch_id: branchId } } : {}),
        },
        select: {
          quantity: true,
          minimum_quantity: true,
          product: { select: { code: true, name: true, unit: true } },
          warehouse: { select: { code: true, name: true } },
        },
        take: 1000,
      }),
    ]).then(
      ([
        salesByPeriod,
        salesByBranch,
        salesByProduct,
        paymentsByMethod,
        salesByClient,
        stockMovements,
        pendingBalances,
        stock,
      ]) => ({
        salesByPeriod,
        salesByBranch,
        salesByProduct,
        paymentsByMethod,
        salesByClient,
        stockMovements,
        pendingBalances,
        stock,
        lowStock: stock.filter((row) =>
          row.quantity.lessThanOrEqualTo(row.minimum_quantity),
        ),
      }),
    );
  }
}
