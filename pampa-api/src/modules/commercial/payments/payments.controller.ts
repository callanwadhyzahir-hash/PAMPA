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
import { CancelPaymentDto, CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiCookieAuth('pampa_access')
@Controller()
export class PaymentsController {
  constructor(
    private readonly service: PaymentsService,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  @Get('payments')
  @RequirePermissions('payments.read')
  findAll(
    @CurrentSecurityContext() context: SecurityContext,
    @Query('status') status?: string,
    @Query('method') method?: string,
  ) {
    return this.service.findAll(context, { status, method });
  }

  @Get('payments/:id')
  @RequirePermissions('payments.read')
  findOne(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(context, id);
  }

  @Post('sales/:id/payments')
  @RequirePermissions('payments.create')
  async create(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) saleId: string,
    @Body() input: CreatePaymentDto,
  ) {
    const payment = await this.service.create(context, saleId, input);
    await this.record(context, 'PAYMENT_COMPLETED', payment.id);
    return payment;
  }

  @Post('payments/:id/cancel')
  @RequirePermissions('payments.refund')
  async cancel(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CancelPaymentDto,
  ) {
    const payment = await this.service.reverse(context, id, input, 'CANCELLED');
    await this.record(context, 'PAYMENT_CANCELLED', id);
    return payment;
  }

  @Post('payments/:id/refund')
  @RequirePermissions('payments.refund')
  async refund(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CancelPaymentDto,
  ) {
    const payment = await this.service.reverse(context, id, input, 'REFUNDED');
    await this.record(context, 'PAYMENT_REFUNDED', id);
    return payment;
  }

  private record(
    context: SecurityContext,
    eventType: string,
    paymentId: string,
  ) {
    return this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType,
      result: 'SUCCESS',
      metadata: { paymentId },
    });
  }
}
