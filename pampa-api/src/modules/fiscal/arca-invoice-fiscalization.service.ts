import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import type { TransactionClient } from '../inventory/stock/repositories/stock.repository';
import { SaleRepository } from '../commercial/sales/repositories/sale.repository';
import type {
  FiscalizationResult,
  FiscalizeInvoiceCommand,
  FiscalProvider,
} from './arca-fiscal.contracts';
import { FISCAL_PROVIDER } from './fiscal-provider.token';
import { FISCAL_POINT_OF_SALE } from './fiscal-point-of-sale.token';
import type { FiscalPointOfSaleConfig } from './fiscal-point-of-sale.token';

@Injectable()
export class ArcaInvoiceFiscalizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly saleRepository: SaleRepository,
    @Inject(FISCAL_PROVIDER) private readonly provider: FiscalProvider,
    @Inject(FISCAL_POINT_OF_SALE)
    private readonly posConfig: FiscalPointOfSaleConfig,
  ) {}

  async fiscalize(
    command: FiscalizeInvoiceCommand,
  ): Promise<FiscalizationResult> {
    const { pointOfSale, voucherTypeCode } = this.posConfig;

    return this.prisma.$transaction(
      async (tx) => {
        const invoice = await this.saleRepository.findInvoiceForFiscalization(
          tx as TransactionClient,
          command.companyId,
          command.invoiceId,
        );
        if (!invoice) throw new NotFoundException('Invoice no encontrado.');

        const attemptNumber =
          (await this.saleRepository.countFiscalAttempts(
            tx as TransactionClient,
            invoice.id,
          )) + 1;

        let voucherNumber = invoice.invoice_number
          ? Number(invoice.invoice_number)
          : null;

        if (voucherNumber) {
          const existing = await this.provider.getExistingVoucher({
            companyId: command.companyId,
            environment: command.environment,
            pointOfSale,
            voucherTypeCode,
            voucherNumber,
          });
          if (existing) {
            await this.persistResult(
              tx as TransactionClient,
              invoice,
              command,
              existing,
              attemptNumber,
              pointOfSale,
              voucherTypeCode,
            );
            return { ...existing, attemptNumber };
          }
        } else {
          const lastAuthorized =
            await this.provider.getLastAuthorizedVoucherNumber({
              companyId: command.companyId,
              environment: command.environment,
              pointOfSale,
              voucherTypeCode,
            });
          voucherNumber = lastAuthorized + 1;
        }

        let result: FiscalizationResult;
        try {
          result = await this.provider.requestCae({
            companyId: command.companyId,
            invoiceId: invoice.id,
            environment: command.environment,
            pointOfSale,
            voucherTypeCode,
            voucherNumber,
            itemsSnapshot: invoice.items_snapshot,
            totalsSnapshot: invoice.totals_snapshot,
            clientSnapshot: invoice.client_snapshot,
            forceOutcome: command.forceOutcome,
          });
        } catch (error) {
          result = {
            status: 'ERROR',
            attemptNumber,
            errorMessage:
              error instanceof Error
                ? error.message
                : 'Error desconocido al solicitar CAE.',
          };
        }

        await this.persistResult(
          tx as TransactionClient,
          invoice,
          command,
          result,
          attemptNumber,
          pointOfSale,
          voucherTypeCode,
        );

        return { ...result, attemptNumber };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async persistResult(
    tx: TransactionClient,
    invoice: { id: string; company_id: string },
    command: FiscalizeInvoiceCommand,
    result: FiscalizationResult,
    attemptNumber: number,
    pointOfSale: string,
    voucherTypeCode: string,
  ): Promise<void> {
    await this.saleRepository.recordFiscalAttempt(tx, {
      invoiceId: invoice.id,
      companyId: invoice.company_id,
      attemptNumber,
      environment: command.environment,
      status: result.status,
      requestPayload: {
        pointOfSale,
        voucherTypeCode,
        voucherNumber: result.invoiceNumber ?? null,
      },
      responsePayload: result as unknown as Prisma.InputJsonValue,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    });

    await this.saleRepository.applyFiscalResult(tx, invoice.id, {
      fiscalStatus: result.status,
      fiscalProvider: result.provider ?? 'ARCA',
      invoiceNumber: result.invoiceNumber,
      pointOfSale: result.pointOfSale ?? pointOfSale,
      voucherTypeCode: result.voucherTypeCode ?? voucherTypeCode,
      cae: result.cae,
      caeExpiration: result.caeExpiration,
      arcaErrorCode: result.errorCode,
      arcaErrorMessage: result.errorMessage,
      fiscalApprovedAt: result.status === 'APPROVED' ? new Date() : undefined,
    });
  }
}
