import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import {
  ExistingVoucherQuery,
  FiscalizationResult,
  FiscalProvider,
  LastAuthorizedVoucherQuery,
  RequestCaeQuery,
} from '../arca-fiscal.contracts';

const CAE_EXPIRATION_DAYS = 10;

/**
 * Dev/demo-only FiscalProvider: never contacts ARCA, never touches
 * certificates/token/sign. Idempotency and correlative numbering are
 * derived from previously-approved `invoice` rows tagged
 * fiscal_provider='MOCK', so no separate state store is needed.
 */
@Injectable()
export class MockFiscalProviderService implements FiscalProvider {
  constructor(private readonly prisma: PrismaService) {}

  async getLastAuthorizedVoucherNumber(
    query: LastAuthorizedVoucherQuery,
  ): Promise<number> {
    const rows = await this.prisma.invoice.findMany({
      where: {
        company_id: query.companyId,
        fiscal_provider: 'MOCK',
        point_of_sale: query.pointOfSale,
        voucher_type_code: query.voucherTypeCode,
        fiscal_status: 'APPROVED',
      },
      select: { invoice_number: true },
    });

    return rows.reduce(
      (max, row) => Math.max(max, Number(row.invoice_number ?? 0)),
      0,
    );
  }

  async getExistingVoucher(
    query: ExistingVoucherQuery,
  ): Promise<FiscalizationResult | null> {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        company_id: query.companyId,
        fiscal_provider: 'MOCK',
        point_of_sale: query.pointOfSale,
        voucher_type_code: query.voucherTypeCode,
        invoice_number: String(query.voucherNumber),
        fiscal_status: 'APPROVED',
      },
      select: { cae: true, cae_expiration: true },
    });

    if (!invoice?.cae) return null;

    return {
      status: 'APPROVED',
      attemptNumber: 0,
      provider: 'MOCK',
      pointOfSale: query.pointOfSale,
      voucherTypeCode: query.voucherTypeCode,
      invoiceNumber: String(query.voucherNumber),
      cae: invoice.cae,
      caeExpiration: invoice.cae_expiration ?? undefined,
    };
  }

  async requestCae(query: RequestCaeQuery): Promise<FiscalizationResult> {
    const base = {
      attemptNumber: 0,
      provider: 'MOCK' as const,
      pointOfSale: query.pointOfSale,
      voucherTypeCode: query.voucherTypeCode,
      invoiceNumber: String(query.voucherNumber),
    };

    if (query.forceOutcome === 'REJECTED') {
      return {
        ...base,
        status: 'REJECTED',
        errorCode: 'MOCK-REJECTED',
        errorMessage: 'Rechazo simulado solicitado manualmente.',
      };
    }

    return {
      ...base,
      status: 'APPROVED',
      cae: this.generateFakeCae(),
      caeExpiration: new Date(
        Date.now() + CAE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
      ),
    };
  }

  /**
   * 14 characters, same length as a real CAE, but with a non-numeric
   * prefix so it can never be mistaken for a real one even if only the
   * string is inspected (the authoritative marker is invoice.fiscal_provider).
   */
  private generateFakeCae(): string {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `00SIMULADO${suffix}`;
  }
}
