import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';
import type { TransactionClient } from '../../../inventory/stock/repositories/stock.repository';

const paymentSelect = {
  id: true,
  company_id: true,
  sale_id: true,
  created_by: true,
  payment_date: true,
  total: true,
  status: true,
  reference: true,
  notes: true,
  cancelled_at: true,
  cancellation_reason: true,
  created_at: true,
  sale: {
    select: {
      id: true,
      sale_number: true,
      total: true,
      status: true,
      client: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          business_name: true,
        },
      },
    },
  },
  user: { select: { id: true, first_name: true, last_name: true } },
  payment_item: true,
} satisfies Prisma.paymentSelect;

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string, filters?: { status?: string; method?: string }) {
    return this.prisma.payment.findMany({
      where: {
        company_id: companyId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.method
          ? { payment_item: { some: { payment_method: filters.method } } }
          : {}),
      },
      select: paymentSelect,
      orderBy: { payment_date: 'desc' },
      take: 200,
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.payment.findFirst({
      where: { id, company_id: companyId },
      select: paymentSelect,
    });
  }

  findByIdTx(tx: TransactionClient, companyId: string, id: string) {
    return tx.payment.findFirst({
      where: { id, company_id: companyId },
      select: paymentSelect,
    });
  }

  lockSale(tx: TransactionClient, companyId: string, saleId: string) {
    const key = `${companyId}:payment:${saleId}`;
    return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }

  findSale(tx: TransactionClient, companyId: string, saleId: string) {
    return tx.sale.findFirst({
      where: { id: saleId, company_id: companyId },
      select: {
        id: true,
        client_id: true,
        total: true,
        status: true,
        payment: {
          where: { status: 'COMPLETED' },
          select: { id: true, total: true },
        },
      },
    });
  }

  create(
    tx: TransactionClient,
    data: {
      companyId: string;
      saleId: string;
      userId: string;
      total: Prisma.Decimal;
      notes?: string;
      items: Array<{
        method: string;
        amount: Prisma.Decimal;
        reference?: string;
      }>;
    },
  ) {
    return tx.payment.create({
      data: {
        company_id: data.companyId,
        sale_id: data.saleId,
        created_by: data.userId,
        total: data.total,
        notes: data.notes,
        payment_item: {
          create: data.items.map((item) => ({
            payment_method: item.method,
            amount: item.amount,
            transaction_reference: item.reference,
          })),
        },
      },
      select: paymentSelect,
    });
  }

  updateSaleStatus(
    tx: TransactionClient,
    saleId: string,
    status: 'CONFIRMED' | 'PARTIALLY_PAID' | 'PAID',
  ) {
    return tx.sale.update({ where: { id: saleId }, data: { status } });
  }

  cancel(
    tx: TransactionClient,
    id: string,
    status: 'CANCELLED' | 'REFUNDED',
    reason: string,
  ) {
    return tx.payment.update({
      where: { id },
      data: {
        status,
        cancelled_at: new Date(),
        cancellation_reason: reason,
      },
      select: paymentSelect,
    });
  }

  async recalculateClientBalance(
    tx: TransactionClient,
    companyId: string,
    clientId?: string | null,
  ) {
    if (!clientId) return;
    await tx.$executeRaw`
      UPDATE "client" c
      SET "current_balance" = (
        SELECT COALESCE(SUM(s."total"), 0)
        FROM "sale" s
        WHERE s."company_id" = ${companyId}
          AND s."client_id" = ${clientId}
          AND s."status" IN ('CONFIRMED', 'PARTIALLY_PAID', 'PAID')
      ) - (
        SELECT COALESCE(SUM(p."total"), 0)
        FROM "payment" p
        JOIN "sale" s ON s."id" = p."sale_id"
        WHERE p."company_id" = ${companyId}
          AND s."client_id" = ${clientId}
          AND p."status" = 'COMPLETED'
      )
      WHERE c."id" = ${clientId}
        AND c."company_id" = ${companyId}
    `;
  }
}
