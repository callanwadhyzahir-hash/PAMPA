import {
  Body,
  Controller,
  Get,
  Optional,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { SecurityAuditService } from '../../auth/audit/security-audit.service';
import { CurrentSecurityContext } from '../../auth/decorators/current-security-context.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import type { SecurityContext } from '../../auth/types/security-context';
import { CancelSaleDto } from './dto/cancel-sale.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SALE_PERMISSIONS } from './sale.permissions';
import { SalesService } from './sales.service';

@ApiTags('Sales')
@ApiCookieAuth('pampa_access')
@Controller('sales')
export class SalesController {
  constructor(
    private readonly service: SalesService,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  @Get()
  @RequirePermissions(SALE_PERMISSIONS.read)
  findAll(
    @CurrentSecurityContext() context: SecurityContext,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.service.findAll(context, { status, branchId, clientId });
  }

  @Get(':id')
  @RequirePermissions(SALE_PERMISSIONS.read)
  findOne(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(context, id);
  }

  @Get(':id/payments')
  @RequirePermissions('payments.read')
  async payments(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return (await this.service.findOne(context, id)).payment;
  }

  @Get(':id/invoice')
  @RequirePermissions('invoices.read')
  async invoice(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return (await this.service.findOne(context, id)).invoice;
  }

  @Post()
  @RequirePermissions(SALE_PERMISSIONS.create)
  async create(
    @CurrentSecurityContext() context: SecurityContext,
    @Body() input: CreateSaleDto,
  ) {
    const sale = await this.service.create(context, input);
    await this.record(context, 'SALE_DRAFT_CREATED', sale.id);
    return sale;
  }

  @Post(':id/confirm')
  @RequirePermissions(SALE_PERMISSIONS.create)
  async confirm(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const sale = await this.service.confirm(context, id);
    await this.record(context, 'SALE_CONFIRMED', id);
    return sale;
  }

  @Post(':id/cancel')
  @RequirePermissions(SALE_PERMISSIONS.cancel)
  async cancel(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CancelSaleDto,
  ) {
    const sale = await this.service.cancel(context, id, input);
    await this.record(context, 'SALE_CANCELLED', id);
    return sale;
  }

  private record(context: SecurityContext, eventType: string, saleId: string) {
    return this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType,
      result: 'SUCCESS',
      metadata: { saleId },
    });
  }
}
