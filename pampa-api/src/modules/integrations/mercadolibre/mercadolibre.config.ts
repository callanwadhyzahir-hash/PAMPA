import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Never crashes the boot process: unlike ARCA (fiscal.module.ts), Mercado
 * Libre is optional per-install. Missing credentials surface as an explicit
 * `configured: false` UI state (see MercadoLibreConnectionService.getStatus),
 * not a startup failure.
 *
 * MERCADOLIBRE_MOCK_MODE only ever takes effect outside production — a
 * misconfigured production deploy silently ignores it rather than serving
 * fake data as real.
 */
@Injectable()
export class MercadoLibreConfigService {
  readonly mockMode: boolean;
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly redirectUri?: string;
  readonly siteId: string;
  readonly frontendUrl: string;
  /** True when either mock mode is active or real OAuth credentials are present. Drives the `configured` flag in GET /status. */
  readonly configured: boolean;

  constructor(config: ConfigService) {
    const nodeEnv = config.get<string>('NODE_ENV');
    const rawMockMode = config.get<string>('MERCADOLIBRE_MOCK_MODE');
    this.mockMode = rawMockMode === 'true' && nodeEnv !== 'production';

    this.clientId = config.get<string>('MERCADOLIBRE_CLIENT_ID') || undefined;
    this.clientSecret =
      config.get<string>('MERCADOLIBRE_CLIENT_SECRET') || undefined;
    this.redirectUri =
      config.get<string>('MERCADOLIBRE_REDIRECT_URI') || undefined;
    this.siteId = config.get<string>('MERCADOLIBRE_SITE_ID') || 'MLA';
    this.frontendUrl =
      config.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    this.configured =
      this.mockMode ||
      Boolean(this.clientId && this.clientSecret && this.redirectUri);
  }
}
