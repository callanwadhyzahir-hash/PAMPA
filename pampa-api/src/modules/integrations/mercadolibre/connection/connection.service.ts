import { Injectable } from '@nestjs/common';

import { MercadoLibreTokenCipher } from '../crypto/mercadolibre-token-cipher';
import { MercadoLibreConfigService } from '../mercadolibre.config';
import {
  MercadoLibreAccountAlreadyLinkedError,
  MercadoLibreNotConnectedError,
  MercadoLibreTokenRefreshFailedError,
} from '../mercadolibre.errors';
import type {
  MercadoLibreClient,
  MercadoLibreTokenSet,
  MercadoLibreUserInfo,
} from '../client/mercadolibre-client.interface';
import {
  MercadoLibreConnectionRepository,
  type MercadoLibreConnectionPublic,
} from './connection.repository';

/** Refresh proactively when the token expires within this window. */
const REFRESH_MARGIN_MS = 60_000;

@Injectable()
export class MercadoLibreConnectionService {
  constructor(
    private readonly repository: MercadoLibreConnectionRepository,
    private readonly cipher: MercadoLibreTokenCipher,
    private readonly config: MercadoLibreConfigService,
  ) {}

  async getStatus(companyId: string) {
    const connection = await this.repository.findByCompany(companyId);
    return this.toStatusResponse(connection);
  }

  toStatusResponse(connection: MercadoLibreConnectionPublic | null) {
    return {
      configured: this.config.configured,
      mockMode: this.config.mockMode,
      connected: connection?.status === 'CONNECTED',
      account: connection
        ? {
            provider: connection.provider,
            nickname: connection.nickname,
            mlUserId: connection.ml_user_id,
            siteId: connection.site_id,
            status: connection.status,
          }
        : null,
      lastSyncAt: connection?.last_sync_at ?? null,
      lastError: connection?.last_error ?? null,
    };
  }

  async disconnect(companyId: string) {
    const connection = await this.repository.findByCompany(companyId);
    if (!connection) throw new MercadoLibreNotConnectedError();
    await this.repository.disconnect(companyId);
  }

  async persistFromOAuth(
    companyId: string,
    tokenSet: MercadoLibreTokenSet,
    userInfo: MercadoLibreUserInfo,
    provider: 'REAL' | 'MOCK',
  ) {
    // MOCK always returns the same fixture mlUserId by design (dev/demo
    // fixtures) — the cross-company guard only makes sense for REAL sellers.
    if (provider === 'REAL') {
      const existing = await this.repository.findConnectedByMlUserId(userInfo.id);
      if (existing && existing.company_id !== companyId) {
        throw new MercadoLibreAccountAlreadyLinkedError();
      }
    }
    await this.repository.upsert(companyId, {
      provider,
      mlUserId: userInfo.id,
      nickname: userInfo.nickname,
      siteId: userInfo.siteId,
      accessTokenEncrypted: this.cipher.encrypt(tokenSet.accessToken),
      refreshTokenEncrypted: this.cipher.encrypt(tokenSet.refreshToken),
      tokenExpiresAt: new Date(Date.now() + tokenSet.expiresIn * 1000),
      scopes: tokenSet.scope,
    });
  }

  /** Resolves an active connection for a company, refreshing its access token first if it's about to expire. Never returns the encrypted form. */
  async getValidAccessToken(
    companyId: string,
    client: MercadoLibreClient,
  ): Promise<{ accessToken: string; mlUserId: string }> {
    const connection = await this.repository.findWithTokensByCompany(companyId);
    if (
      !connection ||
      connection.status !== 'CONNECTED' ||
      !connection.access_token_encrypted ||
      !connection.refresh_token_encrypted
    ) {
      throw new MercadoLibreNotConnectedError();
    }

    const expiresSoon =
      !connection.token_expires_at ||
      connection.token_expires_at.getTime() - Date.now() < REFRESH_MARGIN_MS;

    if (!expiresSoon) {
      return {
        accessToken: this.cipher.decrypt(connection.access_token_encrypted),
        mlUserId: connection.ml_user_id,
      };
    }

    try {
      const refreshToken = this.cipher.decrypt(connection.refresh_token_encrypted);
      const tokenSet = await client.refreshAccessToken(refreshToken);
      await this.repository.updateTokens(companyId, {
        accessTokenEncrypted: this.cipher.encrypt(tokenSet.accessToken),
        refreshTokenEncrypted: this.cipher.encrypt(tokenSet.refreshToken),
        tokenExpiresAt: new Date(Date.now() + tokenSet.expiresIn * 1000),
      });
      return { accessToken: tokenSet.accessToken, mlUserId: connection.ml_user_id };
    } catch {
      await this.repository.markAuthError(
        companyId,
        'MERCADOLIBRE_TOKEN_REFRESH_FAILED',
      );
      throw new MercadoLibreTokenRefreshFailedError();
    }
  }
}
