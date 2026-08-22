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
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { SecurityAuditService } from '../../auth/audit/security-audit.service';
import { CurrentSecurityContext } from '../../auth/decorators/current-security-context.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import type { SecurityContext } from '../../auth/types/security-context';
import { CATALOG_ORDER_PERMISSIONS } from '../../catalog/storefront/catalog.permissions';
import { CatalogOrdersService } from './catalog-orders.service';
import { RejectOrderDto } from './dto/reject-order.dto';

@ApiTags('Catalog Orders')
@ApiCookieAuth('pampa_access')
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Permiso insuficiente.' })
@ApiNotFoundResponse({ description: 'Pedido no encontrado en la empresa.' })
@Controller('catalog-orders')
export class CatalogOrdersController {
  constructor(
    private readonly service: CatalogOrdersService,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  @Get()
  @RequirePermissions(CATALOG_ORDER_PERMISSIONS.read)
  findAll(
    @CurrentSecurityContext() context: SecurityContext,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(context, status);
  }

  @Get(':id')
  @RequirePermissions(CATALOG_ORDER_PERMISSIONS.read)
  findOne(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(context, id);
  }

  @Post(':id/accept')
  @RequirePermissions(CATALOG_ORDER_PERMISSIONS.manage)
  async accept(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const order = await this.service.accept(context, id);
    await this.record(context, 'CATALOG_ORDER_ACCEPTED', id);
    return order;
  }

  @Post(':id/reject')
  @RequirePermissions(CATALOG_ORDER_PERMISSIONS.manage)
  async reject(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: RejectOrderDto,
  ) {
    const order = await this.service.reject(context, id, input);
    await this.record(context, 'CATALOG_ORDER_REJECTED', id);
    return order;
  }

  private record(context: SecurityContext, eventType: string, orderId: string) {
    return this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType,
      result: 'SUCCESS',
      metadata: { orderId },
    });
  }
}
