import { Injectable, Logger } from '@nestjs/common';

import { MercadoLibreConfigService } from '../mercadolibre.config';
import {
  MercadoLibreApiError,
  MercadoLibreAuthFailedError,
  MercadoLibreNotConfiguredError,
  MercadoLibreRateLimitedError,
} from '../mercadolibre.errors';
import type {
  MercadoLibreClient,
  MercadoLibreListingData,
  MercadoLibreOrderData,
  MercadoLibreTokenSet,
  MercadoLibreUserInfo,
} from './mercadolibre-client.interface';

const API_BASE_URL = 'https://api.mercadolibre.com';
const OAUTH_TOKEN_URL = `${API_BASE_URL}/oauth/token`;
const REQUEST_TIMEOUT_MS = 15_000;
const ITEM_SEARCH_LIMIT = 50;

interface MercadoLibreTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
  scope?: string;
}

interface MercadoLibreMeResponse {
  id: number;
  nickname: string;
  site_id: string;
}

interface MercadoLibreItemSearchResponse {
  results: string[];
}

interface MercadoLibreItemResponse {
  id: string;
  title: string;
  status: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  sold_quantity: number;
  thumbnail?: string;
  permalink?: string;
}

interface MercadoLibreOrderSearchResponse {
  results: Array<{
    id: number;
    status: string;
    total_amount: number;
    currency_id: string;
    buyer?: { nickname?: string };
    date_created: string;
    date_closed?: string | null;
  }>;
}

/**
 * Real HTTPS integration against Mercado Libre's REST API. Every method
 * fails closed with MercadoLibreNotConfiguredError when client credentials
 * are absent — this is what lets the module boot and the UI show
 * "no configurado" instead of crashing when ML hasn't been approved yet.
 */
@Injectable()
export class RealMercadoLibreClient implements MercadoLibreClient {
  private readonly logger = new Logger(RealMercadoLibreClient.name);

  constructor(private readonly config: MercadoLibreConfigService) {}

  async exchangeAuthorizationCode(params: {
    code: string;
    codeVerifier: string;
  }): Promise<MercadoLibreTokenSet> {
    const credentials = this.requireCredentials();
    const body = await this.postToken({
      grant_type: 'authorization_code',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code: params.code,
      redirect_uri: credentials.redirectUri,
      code_verifier: params.codeVerifier,
    });
    return this.toTokenSet(body);
  }

  async refreshAccessToken(refreshToken: string): Promise<MercadoLibreTokenSet> {
    const credentials = this.requireCredentials();
    const body = await this.postToken({
      grant_type: 'refresh_token',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: refreshToken,
    });
    return this.toTokenSet(body);
  }

  async getUserInfo(accessToken: string): Promise<MercadoLibreUserInfo> {
    const response = await this.request<MercadoLibreMeResponse>(
      `${API_BASE_URL}/users/me`,
      { accessToken },
    );
    return {
      id: String(response.id),
      nickname: response.nickname,
      siteId: response.site_id,
    };
  }

  async listUserItems(params: {
    accessToken: string;
    sellerId: string;
  }): Promise<MercadoLibreListingData[]> {
    const search = await this.request<MercadoLibreItemSearchResponse>(
      `${API_BASE_URL}/users/${encodeURIComponent(params.sellerId)}/items/search?limit=${ITEM_SEARCH_LIMIT}`,
      { accessToken: params.accessToken },
    );
    if (search.results.length === 0) return [];

    const items = await Promise.all(
      search.results.map((itemId) =>
        this.request<MercadoLibreItemResponse>(
          `${API_BASE_URL}/items/${encodeURIComponent(itemId)}`,
          { accessToken: params.accessToken },
        ),
      ),
    );

    return items.map((item) => ({
      itemId: item.id,
      title: item.title,
      status: item.status,
      price: item.price,
      currencyId: item.currency_id,
      availableQuantity: item.available_quantity,
      soldQuantity: item.sold_quantity,
      thumbnailUrl: item.thumbnail,
      permalink: item.permalink,
    }));
  }

  async listOrders(params: {
    accessToken: string;
    sellerId: string;
  }): Promise<MercadoLibreOrderData[]> {
    const search = await this.request<MercadoLibreOrderSearchResponse>(
      `${API_BASE_URL}/orders/search?seller=${encodeURIComponent(params.sellerId)}`,
      { accessToken: params.accessToken },
    );

    return search.results.map((order) => ({
      orderId: String(order.id),
      status: order.status,
      totalAmount: order.total_amount,
      currencyId: order.currency_id,
      buyerNickname: order.buyer?.nickname,
      dateCreated: new Date(order.date_created),
      dateClosed: order.date_closed ? new Date(order.date_closed) : undefined,
    }));
  }

  private requireCredentials() {
    if (!this.config.clientId || !this.config.clientSecret || !this.config.redirectUri) {
      throw new MercadoLibreNotConfiguredError();
    }
    return {
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      redirectUri: this.config.redirectUri,
    };
  }

  private async postToken(
    form: Record<string, string>,
  ): Promise<MercadoLibreTokenResponse> {
    const response = await this.fetchWithTimeout(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams(form).toString(),
    });
    return this.parseResponse<MercadoLibreTokenResponse>(response, 'oauth/token');
  }

  private async request<T>(
    url: string,
    options: { accessToken: string },
  ): Promise<T> {
    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        Accept: 'application/json',
      },
    });
    return this.parseResponse<T>(response, url);
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      this.logger.error(`Mercado Libre transport failure calling ${url}`);
      throw new MercadoLibreApiError('No se pudo conectar con Mercado Libre.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async parseResponse<T>(response: Response, context: string): Promise<T> {
    if (response.status === 429) {
      throw new MercadoLibreRateLimitedError();
    }
    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`Mercado Libre rejected credentials calling ${context}`);
      throw new MercadoLibreAuthFailedError();
    }
    if (!response.ok) {
      this.logger.error(
        `Mercado Libre returned ${response.status} calling ${context}`,
      );
      throw new MercadoLibreApiError();
    }
    try {
      return (await response.json()) as T;
    } catch {
      throw new MercadoLibreApiError('Respuesta inválida de Mercado Libre.');
    }
  }

  private toTokenSet(body: MercadoLibreTokenResponse): MercadoLibreTokenSet {
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresIn: body.expires_in,
      mlUserId: String(body.user_id),
      scope: body.scope,
    };
  }
}
