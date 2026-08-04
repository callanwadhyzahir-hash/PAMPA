import { Prisma } from '@prisma/client';

/**
 * Mirrors invoice.fiscal_status (pampa-api/prisma/schema.prisma). NOT_REQUESTED
 * is the resting state before any attempt exists; it must never be written to
 * invoice_fiscal_attempt.status, which only ever records an actual call.
 */
export type FiscalStatus =
  | 'NOT_REQUESTED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ERROR';

export type FiscalEnvironment = 'HOMOLOGACION' | 'PRODUCCION';

export interface FiscalizeInvoiceCommand {
  companyId: string;
  invoiceId: string;
  environment: FiscalEnvironment;
}

export interface FiscalizationResult {
  status: FiscalStatus;
  attemptNumber: number;
  pointOfSale?: string;
  voucherTypeCode?: string;
  invoiceNumber?: string;
  cae?: string;
  caeExpiration?: Date;
  qrData?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface LastAuthorizedVoucherQuery {
  companyId: string;
  environment: FiscalEnvironment;
  pointOfSale: string;
  voucherTypeCode: string;
}

export interface RequestCaeQuery {
  companyId: string;
  invoiceId: string;
  environment: FiscalEnvironment;
  pointOfSale: string;
  voucherTypeCode: string;
  voucherNumber: number;
  itemsSnapshot: Prisma.JsonValue;
  totalsSnapshot: Prisma.JsonValue;
  clientSnapshot: Prisma.JsonValue | null;
}

export interface ExistingVoucherQuery {
  companyId: string;
  environment: FiscalEnvironment;
  pointOfSale: string;
  voucherTypeCode: string;
  voucherNumber: number;
}

/**
 * Abstraction over ARCA/WSFEv1. Recovery/idempotency depends on
 * getExistingVoucher: before requesting a new CAE, callers must check
 * whether the (point_of_sale, voucher_type_code, voucher_number) triple was
 * already approved on ARCA's side, so a retry after a lost response never
 * requests a second CAE for the same invoice.
 */
export interface FiscalProvider {
  getLastAuthorizedVoucherNumber(
    query: LastAuthorizedVoucherQuery,
  ): Promise<number>;

  requestCae(query: RequestCaeQuery): Promise<FiscalizationResult>;

  getExistingVoucher(
    query: ExistingVoucherQuery,
  ): Promise<FiscalizationResult | null>;
}
