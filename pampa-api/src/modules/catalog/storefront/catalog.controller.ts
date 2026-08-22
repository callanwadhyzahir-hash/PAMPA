import { Body, Controller, Get, Optional, Put } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { SecurityAuditService } from '../../auth/audit/security-audit.service';
import { CurrentSecurityContext } from '../../auth/decorators/current-security-context.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import type { SecurityContext } from '../../auth/types/security-context';
import { CATALOG_PERMISSIONS } from './catalog.permissions';
import { CatalogService } from './catalog.service';
import { UpsertCatalogDto } from './dto/upsert-catalog.dto';

@ApiTags('Catalog')
@ApiCookieAuth('pampa_access')
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Permiso insuficiente.' })
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly service: CatalogService,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  @Get()
  @RequirePermissions(CATALOG_PERMISSIONS.read)
  getOwn(@CurrentSecurityContext() context: SecurityContext) {
    return this.service.getOwn(context);
  }

  @Put()
  @RequirePermissions(CATALOG_PERMISSIONS.manage)
  async upsert(
    @CurrentSecurityContext() context: SecurityContext,
    @Body() input: UpsertCatalogDto,
  ) {
    const catalog = await this.service.upsert(context, input);
    await this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType: input.isEnabled ? 'CATALOG_ENABLED' : 'CATALOG_UPDATED',
      result: 'SUCCESS',
      metadata: { catalogId: catalog.id, slug: catalog.slug },
    });
    return catalog;
  }
}
