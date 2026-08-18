import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';

export const connectionPublicSelect = {
  id: true,
  company_id: true,
  provider: true,
  ml_user_id: true,
  nickname: true,
  site_id: true,
  status: true,
  last_sync_at: true,
  last_error: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.mercadolibre_connectionSelect;

export type MercadoLibreConnectionPublic = Prisma.mercadolibre_connectionGetPayload<{
  select: typeof connectionPublicSelect;
}>;

interface UpsertConnectionInput {
  provider: 'REAL' | 'MOCK';
  mlUserId: string;
  nickname: string;
  siteId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  tokenExpiresAt: Date;
  scopes?: string;
}

@Injectable()
export class MercadoLibreConnectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCompany(companyId: string): Promise<MercadoLibreConnectionPublic | null> {
    return this.prisma.mercadolibre_connection.findUnique({
      where: { company_id: companyId },
      select: connectionPublicSelect,
    });
  }

  /** Used to block linking one real ML seller account to more than one company at a time. */
  findConnectedByMlUserId(mlUserId: string) {
    return this.prisma.mercadolibre_connection.findFirst({
      where: { ml_user_id: mlUserId, status: 'CONNECTED' },
      select: { company_id: true },
    });
  }

  /** Includes encrypted token columns — only for internal use building outbound API calls. Never return this directly from a controller. */
  findWithTokensByCompany(companyId: string) {
    return this.prisma.mercadolibre_connection.findUnique({
      where: { company_id: companyId },
    });
  }

  async upsert(
    companyId: string,
    input: UpsertConnectionInput,
  ): Promise<MercadoLibreConnectionPublic> {
    return this.prisma.mercadolibre_connection.upsert({
      where: { company_id: companyId },
      create: {
        company_id: companyId,
        provider: input.provider,
        ml_user_id: input.mlUserId,
        nickname: input.nickname,
        site_id: input.siteId,
        access_token_encrypted: input.accessTokenEncrypted,
        refresh_token_encrypted: input.refreshTokenEncrypted,
        token_expires_at: input.tokenExpiresAt,
        scopes: input.scopes,
        status: 'CONNECTED',
        last_error: null,
      },
      update: {
        provider: input.provider,
        ml_user_id: input.mlUserId,
        nickname: input.nickname,
        site_id: input.siteId,
        access_token_encrypted: input.accessTokenEncrypted,
        refresh_token_encrypted: input.refreshTokenEncrypted,
        token_expires_at: input.tokenExpiresAt,
        scopes: input.scopes,
        status: 'CONNECTED',
        last_error: null,
      },
      select: connectionPublicSelect,
    });
  }

  async updateTokens(
    companyId: string,
    tokens: {
      accessTokenEncrypted: string;
      refreshTokenEncrypted: string;
      tokenExpiresAt: Date;
    },
  ) {
    await this.prisma.mercadolibre_connection.update({
      where: { company_id: companyId },
      data: {
        access_token_encrypted: tokens.accessTokenEncrypted,
        refresh_token_encrypted: tokens.refreshTokenEncrypted,
        token_expires_at: tokens.tokenExpiresAt,
        status: 'CONNECTED',
        last_error: null,
      },
    });
  }

  async disconnect(companyId: string) {
    await this.prisma.mercadolibre_connection.update({
      where: { company_id: companyId },
      data: {
        status: 'DISCONNECTED',
        access_token_encrypted: null,
        refresh_token_encrypted: null,
        token_expires_at: null,
        last_error: null,
      },
    });
  }

  async markSynced(companyId: string) {
    await this.prisma.mercadolibre_connection.update({
      where: { company_id: companyId },
      data: { last_sync_at: new Date(), last_error: null },
    });
  }

  /** Records a transient failure (e.g. a sync attempt) without downgrading the connection — tokens may still be valid. */
  async markSyncError(companyId: string, errorCode: string) {
    await this.prisma.mercadolibre_connection.update({
      where: { company_id: companyId },
      data: { last_error: errorCode },
    });
  }

  /** Token refresh failed irrecoverably: the account genuinely needs reconnecting. */
  async markAuthError(companyId: string, errorCode: string) {
    await this.prisma.mercadolibre_connection.update({
      where: { company_id: companyId },
      data: { last_error: errorCode, status: 'ERROR' },
    });
  }
}
