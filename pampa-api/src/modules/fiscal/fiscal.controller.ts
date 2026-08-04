import {
  Body,
  Controller,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSecurityContext } from '../auth/decorators/current-security-context.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { SecurityContext } from '../auth/types/security-context';
import { SaleRepository } from '../commercial/sales/repositories/sale.repository';
import { ArcaInvoiceFiscalizationService } from './arca-invoice-fiscalization.service';
import { FiscalizeSaleInvoiceDto } from './dto/fiscalize-sale-invoice.dto';

@ApiTags('sales')
@ApiCookieAuth()
@Controller('sales')
export class FiscalController {
  constructor(
    private readonly saleRepository: SaleRepository,
    private readonly fiscalization: ArcaInvoiceFiscalizationService,
  ) {}

  @Post(':id/fiscalize')
  @RequirePermissions('invoices.read')
  async fiscalize(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) saleId: string,
    @Body() body: FiscalizeSaleInvoiceDto,
  ) {
    const sale = await this.saleRepository.findById(context.companyId, saleId);
    if (!sale?.invoice) {
      throw new NotFoundException(
        'La venta no tiene un comprobante interno generado.',
      );
    }

    return this.fiscalization.fiscalize({
      companyId: context.companyId,
      invoiceId: sale.invoice.id,
      environment: 'HOMOLOGACION',
      forceOutcome: body?.forceOutcome,
    });
  }
}
