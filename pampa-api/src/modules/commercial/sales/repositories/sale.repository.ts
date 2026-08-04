import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';
import type { TransactionClient } from '../../../inventory/stock/repositories/stock.repository';

export const saleDetailSelect = {
  id: true,
  company_id: true,
  branch_id: true,
  warehouse_id: true,
  client_id: true,
  user_id: true,
  sale_number: true,
  sale_date: true,
  subtotal: true,
  tax_total: true,
  discount_total: true,
  total: true,
  status: true,
  notes: true,
  confirmed_at: true,
  cancelled_at: true,
  cancellation_reason: true,
  branch: { select: { id: true, name: true, code: true } },
  warehouse: { select: { id: true, name: true, code: true } },
  client: {
    select: {
      id: true,
      code: true,
      first_name: true,
      last_name: true,
      business_name: true,
      tax_id: true,
      is_active: true,
    },
  },
  user: { select: { id: true, first_name: true, last_name: true } },
  sale_item: {
    orderBy: { line_number: 'asc' as const },
    select: {
      id: true,
      product_id: true,
      line_number: true,
      product_name: true,
      product_code: true,
      quantity: true,
      unit_price: true,
      tax_rate: true,
      discount_percent: true,
      subtotal: true,
      total: true,
      product: { select: { tracks_stock: true, unit: true } },
    },
  },
  payment: {
    select: {
      id: true,
      payment_date: true,
      total: true,
      status: true,
      payment_item: true,
    },
  },
  invoice: true,
} satisfies Prisma.saleSelect;

@Injectable()
export class SaleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(
    companyId: string,
    filters?: { status?: string; branchId?: string; clientId?: string },
  ) {
    return this.prisma.sale.findMany({
      where: {
        company_id: companyId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.branchId ? { branch_id: filters.branchId } : {}),
        ...(filters?.clientId ? { client_id: filters.clientId } : {}),
      },
      select: saleDetailSelect,
      orderBy: { sale_date: 'desc' },
      take: 200,
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.sale.findFirst({
      where: { id, company_id: companyId },
      select: saleDetailSelect,
    });
  }

  findByIdTx(tx: TransactionClient, companyId: string, id: string) {
    return tx.sale.findFirst({
      where: { id, company_id: companyId },
      select: saleDetailSelect,
    });
  }

  findResources(
    tx: TransactionClient,
    companyId: string,
    branchId: string,
    warehouseId: string,
    clientId?: string,
  ) {
    return Promise.all([
      tx.branch.findFirst({
        where: { id: branchId, company_id: companyId, is_active: true },
        select: { id: true },
      }),
      tx.warehouse.findFirst({
        where: {
          id: warehouseId,
          company_id: companyId,
          branch_id: branchId,
          is_active: true,
        },
        select: { id: true },
      }),
      clientId
        ? tx.client.findFirst({
            where: { id: clientId, company_id: companyId, is_active: true },
            select: { id: true },
          })
        : Promise.resolve({ id: 'FINAL_CONSUMER' }),
    ]);
  }

  findProducts(tx: TransactionClient, companyId: string, ids: string[]) {
    return tx.product.findMany({
      where: { id: { in: ids }, company_id: companyId, is_active: true },
      select: {
        id: true,
        code: true,
        name: true,
        sale_price: true,
        tax_rate: true,
        tracks_stock: true,
      },
    });
  }

  create(
    tx: TransactionClient,
    data: {
      companyId: string;
      branchId: string;
      warehouseId: string;
      clientId?: string;
      userId: string;
      notes?: string;
      subtotal: Prisma.Decimal;
      taxTotal: Prisma.Decimal;
      discountTotal: Prisma.Decimal;
      total: Prisma.Decimal;
      items: Array<{
        productId: string;
        lineNumber: number;
        productName: string;
        productCode: string;
        quantity: Prisma.Decimal;
        unitPrice: Prisma.Decimal;
        taxRate: Prisma.Decimal;
        discountPercent: Prisma.Decimal;
        subtotal: Prisma.Decimal;
        total: Prisma.Decimal;
      }>;
    },
  ) {
    return tx.sale.create({
      data: {
        company_id: data.companyId,
        branch_id: data.branchId,
        warehouse_id: data.warehouseId,
        client_id: data.clientId,
        user_id: data.userId,
        notes: data.notes,
        subtotal: data.subtotal,
        tax_total: data.taxTotal,
        discount_total: data.discountTotal,
        total: data.total,
        status: 'DRAFT',
        sale_item: {
          create: data.items.map((item) => ({
            line_number: item.lineNumber,
            product_name: item.productName,
            product_code: item.productCode,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            tax_rate: item.taxRate,
            discount_percent: item.discountPercent,
            subtotal: item.subtotal,
            total: item.total,
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
      select: saleDetailSelect,
    });
  }

  confirm(
    tx: TransactionClient,
    companyId: string,
    id: string,
    totals: {
      subtotal: Prisma.Decimal;
      taxTotal: Prisma.Decimal;
      discountTotal: Prisma.Decimal;
      total: Prisma.Decimal;
    },
    items: Array<{
      id: string;
      productName: string;
      productCode: string;
      unitPrice: Prisma.Decimal;
      taxRate: Prisma.Decimal;
      discountPercent: Prisma.Decimal;
      subtotal: Prisma.Decimal;
      total: Prisma.Decimal;
    }>,
  ) {
    return Promise.all([
      ...items.map((item) =>
        tx.sale_item.update({
          where: { id: item.id },
          data: {
            product_name: item.productName,
            product_code: item.productCode,
            unit_price: item.unitPrice,
            tax_rate: item.taxRate,
            discount_percent: item.discountPercent,
            subtotal: item.subtotal,
            total: item.total,
          },
        }),
      ),
      tx.sale.update({
        where: { id },
        data: {
          subtotal: totals.subtotal,
          tax_total: totals.taxTotal,
          discount_total: totals.discountTotal,
          total: totals.total,
          status: 'CONFIRMED',
          confirmed_at: new Date(),
        },
      }),
    ]);
  }

  createInvoice(
    tx: TransactionClient,
    data: {
      companyId: string;
      saleId: string;
      internalNumber: string;
      companySnapshot: Prisma.InputJsonValue;
      clientSnapshot?: Prisma.InputJsonValue;
      itemsSnapshot: Prisma.InputJsonValue;
      totalsSnapshot: Prisma.InputJsonValue;
    },
  ) {
    return tx.invoice.create({
      data: {
        company_id: data.companyId,
        sale_id: data.saleId,
        internal_number: data.internalNumber,
        issued_at: new Date(),
        company_snapshot: data.companySnapshot,
        client_snapshot: data.clientSnapshot,
        items_snapshot: data.itemsSnapshot,
        totals_snapshot: data.totalsSnapshot,
      },
    });
  }

  companySnapshot(tx: TransactionClient, companyId: string) {
    return tx.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        legal_name: true,
        tax_id: true,
        email: true,
        phone: true,
        currency: { select: { code: true, symbol: true } },
      },
    });
  }

  cancel(tx: TransactionClient, id: string, userId: string, reason: string) {
    return Promise.all([
      tx.sale.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelled_at: new Date(),
          cancelled_by: userId,
          cancellation_reason: reason,
        },
      }),
      tx.invoice.updateMany({
        where: { sale_id: id },
        data: { status: 'CANCELLED' },
      }),
    ]);
  }

  findInvoiceForFiscalization(
    tx: TransactionClient,
    companyId: string,
    invoiceId: string,
  ) {
    return tx.invoice.findFirst({
      where: { id: invoiceId, company_id: companyId },
      select: {
        id: true,
        company_id: true,
        point_of_sale: true,
        voucher_type_code: true,
        invoice_number: true,
        fiscal_status: true,
        items_snapshot: true,
        totals_snapshot: true,
        client_snapshot: true,
      },
    });
  }

  countFiscalAttempts(tx: TransactionClient, invoiceId: string) {
    return tx.invoice_fiscal_attempt.count({
      where: { invoice_id: invoiceId },
    });
  }

  recordFiscalAttempt(
    tx: TransactionClient,
    data: {
      invoiceId: string;
      companyId: string;
      attemptNumber: number;
      environment: string;
      status: string;
      requestPayload: Prisma.InputJsonValue;
      responsePayload?: Prisma.InputJsonValue;
      errorCode?: string;
      errorMessage?: string;
    },
  ) {
    return tx.invoice_fiscal_attempt.create({
      data: {
        invoice_id: data.invoiceId,
        company_id: data.companyId,
        attempt_number: data.attemptNumber,
        environment: data.environment,
        status: data.status,
        request_payload: data.requestPayload,
        response_payload: data.responsePayload,
        error_code: data.errorCode,
        error_message: data.errorMessage,
        finished_at: new Date(),
      },
    });
  }

  applyFiscalResult(
    tx: TransactionClient,
    invoiceId: string,
    data: {
      fiscalStatus: string;
      fiscalProvider: string;
      invoiceNumber?: string;
      pointOfSale?: string;
      voucherTypeCode?: string;
      cae?: string;
      caeExpiration?: Date;
      arcaErrorCode?: string;
      arcaErrorMessage?: string;
      fiscalApprovedAt?: Date;
    },
  ) {
    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        fiscal_status: data.fiscalStatus,
        fiscal_provider: data.fiscalProvider,
        invoice_number: data.invoiceNumber,
        point_of_sale: data.pointOfSale,
        voucher_type_code: data.voucherTypeCode,
        cae: data.cae,
        cae_expiration: data.caeExpiration,
        arca_error_code: data.arcaErrorCode,
        arca_error_message: data.arcaErrorMessage,
        fiscal_requested_at: new Date(),
        fiscal_approved_at: data.fiscalApprovedAt,
      },
    });
  }
}
