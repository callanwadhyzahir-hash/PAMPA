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
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { StockTransferDto } from './dto/stock-transfer.dto';
import { STOCK_PERMISSIONS } from './stock.permissions';
import { StockService } from './stock.service';

@ApiTags('Stock')
@ApiCookieAuth('pampa_access')
@Controller()
export class StockController {
  constructor(
    private readonly service: StockService,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  @Get('stock')
  @RequirePermissions(STOCK_PERMISSIONS.read)
  findAll(
    @CurrentSecurityContext() context: SecurityContext,
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.service.findAll(context, {
      productId,
      warehouseId,
      lowStock: lowStock === 'true',
    });
  }

  @Get('stock/summary')
  @RequirePermissions(STOCK_PERMISSIONS.read)
  summary(@CurrentSecurityContext() context: SecurityContext) {
    return this.service.summary(context);
  }

  @Get('stock/products/:productId')
  @RequirePermissions(STOCK_PERMISSIONS.read)
  byProduct(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.service.findAll(context, { productId });
  }

  @Get('stock/warehouses/:warehouseId')
  @RequirePermissions(STOCK_PERMISSIONS.read)
  byWarehouse(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
  ) {
    return this.service.findAll(context, { warehouseId });
  }

  @Post('stock/adjustments')
  @RequirePermissions(STOCK_PERMISSIONS.adjust)
  async adjust(
    @CurrentSecurityContext() context: SecurityContext,
    @Body() input: StockAdjustmentDto,
  ) {
    const result = await this.service.adjust(context, input);
    await this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType: 'STOCK_ADJUSTED',
      result: 'SUCCESS',
      metadata: {
        productId: input.productId,
        warehouseId: input.warehouseId,
        movementType: input.movementType,
      },
    });
    return result;
  }

  @Post('stock/transfers')
  @RequirePermissions(STOCK_PERMISSIONS.transfer)
  async transfer(
    @CurrentSecurityContext() context: SecurityContext,
    @Body() input: StockTransferDto,
  ) {
    const result = await this.service.transfer(context, input);
    await this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType: 'STOCK_TRANSFERRED',
      result: 'SUCCESS',
      metadata: {
        productId: input.productId,
        sourceWarehouseId: input.sourceWarehouseId,
        targetWarehouseId: input.targetWarehouseId,
      },
    });
    return result;
  }

  @Get('stock-movements')
  @RequirePermissions(STOCK_PERMISSIONS.movementsRead)
  movements(
    @CurrentSecurityContext() context: SecurityContext,
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.service.findMovements(context, { productId, warehouseId });
  }

  @Get('stock-movements/:id')
  @RequirePermissions(STOCK_PERMISSIONS.movementsRead)
  movement(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findMovement(context, id);
  }
}
