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
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { PRODUCT_CATEGORY_PERMISSIONS } from './product-category.permissions';
import { ProductCategoriesService } from './product-categories.service';

@ApiTags('Product categories')
@ApiCookieAuth('pampa_access')
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Permiso insuficiente.' })
@ApiNotFoundResponse({ description: 'Categoría no encontrada en la empresa.' })
@Controller('product-categories')
export class ProductCategoriesController {
  constructor(
    private readonly service: ProductCategoriesService,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  @Get()
  @RequirePermissions(PRODUCT_CATEGORY_PERMISSIONS.read)
  findAll(
    @CurrentSecurityContext() context: SecurityContext,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(context, search);
  }

  @Get(':id')
  @RequirePermissions(PRODUCT_CATEGORY_PERMISSIONS.read)
  findOne(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(context, id);
  }

  @Post()
  @RequirePermissions(PRODUCT_CATEGORY_PERMISSIONS.create)
  async create(
    @CurrentSecurityContext() context: SecurityContext,
    @Body() input: CreateProductCategoryDto,
  ) {
    const category = await this.service.create(context, input);
    await this.record(context, 'PRODUCT_CATEGORY_CREATED', category.id);
    return category;
  }

  @Patch(':id')
  @RequirePermissions(PRODUCT_CATEGORY_PERMISSIONS.update)
  async update(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateProductCategoryDto,
  ) {
    const category = await this.service.update(context, id, input);
    await this.record(context, 'PRODUCT_CATEGORY_UPDATED', id);
    return category;
  }

  @Delete(':id')
  @RequirePermissions(PRODUCT_CATEGORY_PERMISSIONS.delete)
  async remove(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.service.remove(context, id);
    await this.record(
      context,
      result.status === 'DEACTIVATED'
        ? 'PRODUCT_CATEGORY_DEACTIVATED'
        : 'PRODUCT_CATEGORY_DELETED',
      id,
    );
    return result;
  }

  private record(
    context: SecurityContext,
    eventType: string,
    categoryId: string,
  ) {
    return this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType,
      result: 'SUCCESS',
      metadata: { categoryId },
    });
  }
}
