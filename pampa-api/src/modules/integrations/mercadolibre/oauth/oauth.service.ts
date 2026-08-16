import { Inject, Injectable } from '@nestjs/common';

import { MERCADOLIBRE_CLIENT } from '../client/mercadolibre-client.token';
import type { MercadoLibreClient } from '../client/mercadolibre-client.interface';
import { MercadoLibreConnectionService } from '../connection/connection.service';
import { MercadoLibreConfigService } from '../mercadolibre.config';
import { MercadoLibreAuthFailedError } from '../mercadolibre.errors';
import type { SecurityContext } from '../../../auth/types/security-context';
import { generatePkcePair } from './pkce.util';
import { MercadoLibreOAuthStateService } from './oauth-state.service';

/** Site (country) -> ML authorization domain. Falls back to Argentina if the configured site is unrecognized. */
const AUTH_DOMAIN_BY_SITE: Record<string, string> = {
  MLA: 'auth.mercadolibre.com.ar',
  MLB: 'auth.mercadolivre.com.br',
  MLM: 'auth.mercadolibre.com.mx',
  MLC: 'auth.mercadolibre.cl',
  MCO: 'auth.mercadolibre.com.co',
  MPE: 'auth.mercadolibre.com.pe',
  MLU: 'auth.mercadolibre.com.uy',
  MLV: 'auth.mercadolibre.com.ve',
};

export type ConnectResult =
  | { mock: true }
  | { mock: false; authorizationUrl: string; codeVerifier: string };

@Injectable()
export class MercadoLibreOAuthService {
  constructor(
    @Inject(MERCADOLIBRE_CLIENT) private readonly client: MercadoLibreClient,
    private readonly config: MercadoLibreConfigService,
    private readonly connections: MercadoLibreConnectionService,
    private readonly state: MercadoLibreOAuthStateService,
  ) {}

  /**
   * In mock mode, "connecting" happens synchronously server-side — there is
   * no real Mercado Libre to redirect the browser to. Outside mock mode this
   * builds the real authorization URL; MercadoLibreConfigService already
   * guarantees credentials are present whenever mockMode is false and
   * `configured` is true (checked by the caller/RealMercadoLibreClient).
   */
  async connect(context: SecurityContext): Promise<ConnectResult> {
    if (this.config.mockMode) {
      const tokenSet = await this.client.exchangeAuthorizationCode({
        code: 'mock',
        codeVerifier: 'mock',
      });
      const userInfo = await this.client.getUserInfo(tokenSet.accessToken);
      await this.connections.persistFromOAuth(
        context.companyId,
        tokenSet,
        userInfo,
        'MOCK',
      );
      return { mock: true };
    }

    const { codeVerifier, codeChallenge } = generatePkcePair();
    const state = this.state.sign(context.companyId, context.userId);
    const authorizationUrl = this.buildAuthorizationUrl(state, codeChallenge);
    return { mock: false, authorizationUrl, codeVerifier };
  }

  async handleCallback(params: {
    code?: string;
    state?: string;
    error?: string;
    codeVerifier?: string;
  }): Promise<{ companyId: string; userId: string }> {
    if (params.error || !params.code || !params.state) {
      throw new MercadoLibreAuthFailedError();
    }
    if (!params.codeVerifier) {
      throw new MercadoLibreAuthFailedError();
    }

    const { companyId, userId } = this.state.verify(params.state);

    const tokenSet = await this.client.exchangeAuthorizationCode({
      code: params.code,
      codeVerifier: params.codeVerifier,
    });
    const userInfo = await this.client.getUserInfo(tokenSet.accessToken);
    await this.connections.persistFromOAuth(companyId, tokenSet, userInfo, 'REAL');

    return { companyId, userId };
  }

  private buildAuthorizationUrl(state: string, codeChallenge: string): string {
    const domain = AUTH_DOMAIN_BY_SITE[this.config.siteId] ?? AUTH_DOMAIN_BY_SITE.MLA;
    const url = new URL(`https://${domain}/authorization`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.config.clientId ?? '');
    url.searchParams.set('redirect_uri', this.config.redirectUri ?? '');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }
}
