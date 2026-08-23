import {
  Body,
  Controller,
  Delete,
  Get,
  Optional,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { SecurityAuditService } from '../../../auth/audit/security-audit.service';
import { CurrentSecurityContext } from '../../../auth/decorators/current-security-context.decorator';
import { RequirePermissions } from '../../../auth/decorators/require-permissions.decorator';
import type { SecurityContext } from '../../../auth/types/security-context';
import { PRODUCT_PERMISSIONS } from '../product.permissions';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ProductVariantsService } from './product-variants.service';

@ApiTags('Products')
@ApiCookieAuth('pampa_access')
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Permiso insuficiente.' })
@ApiNotFoundResponse({ description: 'Producto o variante no encontrada en la empresa.' })
@Controller('products/:productId/variants')
export class ProductVariantsController {
  constructor(
    private readonly service: ProductVariantsService,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  @Get()
  @RequirePermissions(PRODUCT_PERMISSIONS.read)
  findAll(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.service.findAll(context, productId);
  }

  @Post()
  @RequirePermissions(PRODUCT_PERMISSIONS.update)
  async create(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() input: CreateProductVariantDto,
  ) {
    const variant = await this.service.create(context, productId, input);
    await this.record(context, 'PRODUCT_VARIANT_CREATED', productId, variant?.id);
    return variant;
  }

  @Patch(':id')
  @RequirePermissions(PRODUCT_PERMISSIONS.update)
  async update(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateProductVariantDto,
  ) {
    const variant = await this.service.update(context, productId, id, input);
    await this.record(context, 'PRODUCT_VARIANT_UPDATED', productId, id);
    return variant;
  }

  @Delete(':id')
  @RequirePermissions(PRODUCT_PERMISSIONS.delete)
  async remove(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.service.remove(context, productId, id);
    await this.record(
      context,
      result.status === 'DEACTIVATED'
        ? 'PRODUCT_VARIANT_DEACTIVATED'
        : 'PRODUCT_VARIANT_DELETED',
      productId,
      id,
    );
    return result;
  }

  private record(
    context: SecurityContext,
    eventType: string,
    productId: string,
    variantId?: string,
  ) {
    return this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType,
      result: 'SUCCESS',
      metadata: { productId, variantId },
    });
  }
}
