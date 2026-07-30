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
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PRODUCT_PERMISSIONS } from './product.permissions';
import { ProductsService } from './products.service';

@ApiTags('Products')
@ApiCookieAuth('pampa_access')
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Permiso insuficiente.' })
@ApiNotFoundResponse({ description: 'Producto no encontrado en la empresa.' })
@Controller('products')
export class ProductsController {
  constructor(
    private readonly service: ProductsService,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  @Get()
  @RequirePermissions(PRODUCT_PERMISSIONS.read)
  findAll(
    @CurrentSecurityContext() context: SecurityContext,
    @Query() query: ProductQueryDto,
  ) {
    return this.service.findAll(context, query);
  }

  @Get('barcode/:barcode')
  @RequirePermissions(PRODUCT_PERMISSIONS.read)
  findByBarcode(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('barcode') barcode: string,
  ) {
    return this.service.findByBarcode(context, barcode);
  }

  @Get(':id/stock')
  @RequirePermissions(PRODUCT_PERMISSIONS.stockRead)
  findStock(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findStock(context, id);
  }

  @Get(':id/movements')
  @RequirePermissions(PRODUCT_PERMISSIONS.movementsRead)
  findMovements(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findMovements(context, id);
  }

  @Get(':id')
  @RequirePermissions(PRODUCT_PERMISSIONS.read)
  findOne(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(context, id);
  }

  @Post()
  @RequirePermissions(PRODUCT_PERMISSIONS.create)
  async create(
    @CurrentSecurityContext() context: SecurityContext,
    @Body() input: CreateProductDto,
  ) {
    const product = await this.service.create(context, input);
    await this.record(context, 'PRODUCT_CREATED', product.id);
    return product;
  }

  @Patch(':id')
  @RequirePermissions(PRODUCT_PERMISSIONS.update)
  async update(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateProductDto,
  ) {
    const product = await this.service.update(context, id, input);
    await this.record(context, 'PRODUCT_UPDATED', id);
    return product;
  }

  @Delete(':id')
  @RequirePermissions(PRODUCT_PERMISSIONS.delete)
  async deactivate(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const product = await this.service.deactivate(context, id);
    await this.record(context, 'PRODUCT_DEACTIVATED', id);
    return product;
  }

  private record(
    context: SecurityContext,
    eventType: string,
    productId: string,
  ) {
    return this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType,
      result: 'SUCCESS',
      metadata: { productId },
    });
  }
}
