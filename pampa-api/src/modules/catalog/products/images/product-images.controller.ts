import {
  Controller,
  Delete,
  Optional,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { ProductImageUploadExceptionFilter } from './product-image-upload.filter';
import { ProductImagesService } from './product-images.service';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

@ApiTags('Products')
@ApiCookieAuth('pampa_access')
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Permiso insuficiente.' })
@ApiNotFoundResponse({ description: 'Producto no encontrado en la empresa.' })
@Controller('products/:id/image')
export class ProductImagesController {
  constructor(
    private readonly service: ProductImagesService,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  @Post()
  @RequirePermissions(PRODUCT_PERMISSIONS.update)
  @UseFilters(ProductImageUploadExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  async upload(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const result = await this.service.upload(context, id, file);
    await this.record(context, 'PRODUCT_IMAGE_UPLOADED', id);
    return result;
  }

  @Delete()
  @RequirePermissions(PRODUCT_PERMISSIONS.update)
  async remove(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.service.remove(context, id);
    await this.record(context, 'PRODUCT_IMAGE_REMOVED', id);
    return result;
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
