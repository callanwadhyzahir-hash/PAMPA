import {
  BadRequestException,
  Body,
  Controller,
  Optional,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { AI_PERMISSIONS } from '../../ai/ai.permissions';
import { SecurityAuditService } from '../../auth/audit/security-audit.service';
import { CurrentSecurityContext } from '../../auth/decorators/current-security-context.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import type { SecurityContext } from '../../auth/types/security-context';
import { PRODUCT_PERMISSIONS } from '../../catalog/products/product.permissions';
import { STOCK_PERMISSIONS } from '../stock/stock.permissions';
import { ConfirmImportDto } from './dto/confirm-import.dto';
import { ExtractImageDto, ExtractTextDto } from './dto/extract-text.dto';
import { SmartImportService } from './smart-import.service';

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

@ApiTags('Inventory')
@ApiCookieAuth('pampa_access')
@Controller('inventory/smart-import')
export class SmartImportController {
  constructor(
    private readonly service: SmartImportService,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  @Post('extract-text')
  @RequirePermissions(AI_PERMISSIONS.use, PRODUCT_PERMISSIONS.create)
  extractText(
    @CurrentSecurityContext() context: SecurityContext,
    @Body() dto: ExtractTextDto,
  ) {
    return this.service.extractFromText(context, dto.text);
  }

  @Post('extract-image')
  @RequirePermissions(AI_PERMISSIONS.use, PRODUCT_PERMISSIONS.create)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  extractImage(
    @CurrentSecurityContext() context: SecurityContext,
    @Body() dto: ExtractImageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Subí una imagen, foto o documento.');
    }
    if (!ACCEPTED_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Formato no soportado. Usá JPG, PNG, WebP o PDF.',
      );
    }
    return this.service.extractFromImage(
      context,
      { mimeType: file.mimetype, dataBase64: file.buffer.toString('base64') },
      dto.text,
    );
  }

  @Post('confirm')
  @RequirePermissions(
    AI_PERMISSIONS.use,
    PRODUCT_PERMISSIONS.create,
    STOCK_PERMISSIONS.adjust,
  )
  async confirm(
    @CurrentSecurityContext() context: SecurityContext,
    @Body() dto: ConfirmImportDto,
  ) {
    const result = await this.service.confirm(context, dto);
    await this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType: 'SMART_IMPORT_CONFIRMED',
      result: 'SUCCESS',
      metadata: { created: result.created, failed: result.failed },
    });
    return result;
  }
}
