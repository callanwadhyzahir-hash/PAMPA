import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Optional,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

import { SecurityAuditService } from '../../auth/audit/security-audit.service';
import { CurrentSecurityContext } from '../../auth/decorators/current-security-context.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import type { SecurityContext } from '../../auth/types/security-context';
import { MercadoLibreConnectionService } from './connection/connection.service';
import { LinkListingDto } from './listings/dto/link-listing.dto';
import { ListingQueryDto } from './listings/dto/listing-query.dto';
import { MercadoLibreListingsService } from './listings/listings.service';
import { MERCADOLIBRE_PERMISSIONS } from './mercadolibre.permissions';
import { MercadoLibreOAuthService } from './oauth/oauth.service';
import { OrderQueryDto } from './orders/dto/order-query.dto';
import { MercadoLibreOrdersService } from './orders/orders.service';
import { MercadoLibreSyncService } from './sync/sync.service';

const CODE_VERIFIER_COOKIE = 'pampa_ml_oauth_cv';

function extractCookie(request: Request, name: string) {
  const header = request.headers.cookie;
  if (!header) return null;
  const pair = header
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

@ApiTags('Integrations - Mercado Libre')
@ApiCookieAuth('pampa_access')
@Controller('integrations/mercadolibre')
export class MercadoLibreController {
  constructor(
    private readonly connections: MercadoLibreConnectionService,
    private readonly oauth: MercadoLibreOAuthService,
    private readonly listings: MercadoLibreListingsService,
    private readonly orders: MercadoLibreOrdersService,
    private readonly sync: MercadoLibreSyncService,
    private readonly configService: ConfigService,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  @Get('status')
  @RequirePermissions(MERCADOLIBRE_PERMISSIONS.read)
  status(@CurrentSecurityContext() context: SecurityContext) {
    return this.connections.getStatus(context.companyId);
  }

  @Get('connect')
  @RequirePermissions(MERCADOLIBRE_PERMISSIONS.manage)
  async connect(
    @CurrentSecurityContext() context: SecurityContext,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.oauth.connect(context);
    if (result.mock) {
      await this.record(context, 'MERCADOLIBRE_CONNECTED', { provider: 'MOCK' });
      return { connected: true, mock: true };
    }
    response.cookie(CODE_VERIFIER_COOKIE, result.codeVerifier, this.verifierCookieOptions());
    return { authorizationUrl: result.authorizationUrl };
  }

  @Get('callback')
  @Public()
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const redirectBase = `${frontendUrl}/dashboard/integrations/mercadolibre`;
    const codeVerifier = extractCookie(request, CODE_VERIFIER_COOKIE) ?? undefined;

    try {
      const { companyId, userId } = await this.oauth.handleCallback({
        code,
        state,
        error,
        codeVerifier,
      });
      await this.audit?.record({
        companyId,
        actorUserId: userId,
        eventType: 'MERCADOLIBRE_CONNECTED',
        result: 'SUCCESS',
        metadata: { provider: 'REAL' },
      });
      response.clearCookie(CODE_VERIFIER_COOKIE, this.verifierCookieOptions());
      response.redirect(`${redirectBase}?ml=connected`);
    } catch {
      response.clearCookie(CODE_VERIFIER_COOKIE, this.verifierCookieOptions());
      response.redirect(`${redirectBase}?ml=error`);
    }
  }

  @Post('disconnect')
  @RequirePermissions(MERCADOLIBRE_PERMISSIONS.manage)
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@CurrentSecurityContext() context: SecurityContext) {
    await this.connections.disconnect(context.companyId);
    await this.record(context, 'MERCADOLIBRE_DISCONNECTED', {});
  }

  @Get('listings')
  @RequirePermissions(MERCADOLIBRE_PERMISSIONS.read)
  listListings(
    @CurrentSecurityContext() context: SecurityContext,
    @Query() query: ListingQueryDto,
  ) {
    return this.listings.findAll(context, query);
  }

  @Post('listings/:id/link')
  @RequirePermissions(MERCADOLIBRE_PERMISSIONS.manage)
  async link(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: LinkListingDto,
  ) {
    const link = await this.listings.link(context, id, body.productId);
    await this.record(context, 'MERCADOLIBRE_LISTING_LINKED', {
      listingId: id,
      productId: body.productId,
    });
    return link;
  }

  @Delete('listings/:id/link')
  @RequirePermissions(MERCADOLIBRE_PERMISSIONS.manage)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlink(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.listings.unlink(context, id);
    await this.record(context, 'MERCADOLIBRE_LISTING_UNLINKED', { listingId: id });
  }

  @Get('orders')
  @RequirePermissions(MERCADOLIBRE_PERMISSIONS.read)
  listOrders(
    @CurrentSecurityContext() context: SecurityContext,
    @Query() query: OrderQueryDto,
  ) {
    return this.orders.findAll(context, query);
  }

  @Post('sync')
  @RequirePermissions(MERCADOLIBRE_PERMISSIONS.manage)
  async runSync(@CurrentSecurityContext() context: SecurityContext) {
    const result = await this.sync.sync(context.companyId);
    await this.record(context, 'MERCADOLIBRE_SYNC_COMPLETED', {
      listingsSynced: result.listingsSynced,
      ordersSynced: result.ordersSynced,
    });
    return result;
  }

  private verifierCookieOptions() {
    const production = this.configService.get('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: production,
      sameSite: 'lax' as const,
      maxAge: 10 * 60 * 1000,
      /**
       * Must be a literal prefix of every path the browser sees for both
       * /connect and /callback. The frontend calls this API through its own
       * same-origin proxy (src/app/api/backend/[...path]/route.ts), so the
       * browser's real request path is /api/backend/integrations/mercadolibre/...,
       * not /integrations/mercadolibre/... — scoping to the latter meant the
       * cookie set at /connect was never sent back at /callback.
       */
      path: '/',
    };
  }

  private record(
    context: SecurityContext,
    eventType: string,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType,
      result: 'SUCCESS',
      metadata,
    });
  }
}
