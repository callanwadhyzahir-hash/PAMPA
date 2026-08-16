import { Injectable } from '@nestjs/common';

import type {
  MercadoLibreClient,
  MercadoLibreListingData,
  MercadoLibreOrderData,
  MercadoLibreTokenSet,
  MercadoLibreUserInfo,
} from './mercadolibre-client.interface';

const MOCK_ML_USER_ID = '900000001';
const MOCK_NICKNAME = 'PAMPA_DEV_TEST';
const MOCK_SITE_ID = 'MLA';

/**
 * Dev/demo-only MercadoLibreClient: never contacts Mercado Libre. Returns a
 * fixed, deterministic fixture set so repeated `sync` calls upsert the same
 * rows (idempotent) instead of accumulating duplicates. Selected only when
 * MercadoLibreConfigService.mockMode is true (MERCADOLIBRE_MOCK_MODE=true
 * and NODE_ENV !== production) — see MercadoLibreModule.
 */
@Injectable()
export class MockMercadoLibreClient implements MercadoLibreClient {
  async exchangeAuthorizationCode(): Promise<MercadoLibreTokenSet> {
    return this.fakeTokenSet();
  }

  async refreshAccessToken(): Promise<MercadoLibreTokenSet> {
    return this.fakeTokenSet();
  }

  async getUserInfo(): Promise<MercadoLibreUserInfo> {
    return { id: MOCK_ML_USER_ID, nickname: MOCK_NICKNAME, siteId: MOCK_SITE_ID };
  }

  async listUserItems(): Promise<MercadoLibreListingData[]> {
    return [
      this.item('MOCK-ML-0001', 'Zapatillas urbanas running gris', 'active', 45999, 12, 87),
      this.item('MOCK-ML-0002', 'Mochila impermeable 25L', 'active', 28999, 30, 142),
      this.item('MOCK-ML-0003', 'Auriculares inalámbricos bluetooth', 'active', 19999, 0, 310),
      this.item('MOCK-ML-0004', 'Termo acero inoxidable 1L', 'paused', 12999, 8, 54),
      this.item('MOCK-ML-0005', 'Campera rompeviento impermeable', 'active', 34999, 5, 21),
      this.item('MOCK-ML-0006', 'Remera algodón premium pack x3', 'active', 15999, 60, 205),
      this.item('MOCK-ML-0007', 'Reloj deportivo resistente al agua', 'closed', 22999, 0, 12),
      this.item('MOCK-ML-0008', 'Botas de trekking impermeables', 'under_review', 52999, 4, 3),
    ];
  }

  async listOrders(): Promise<MercadoLibreOrderData[]> {
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    return [
      this.order('MOCK-ORD-0001', 'paid', 45999, 'comprador_ana', now - 1 * day, now - 1 * day),
      this.order('MOCK-ORD-0002', 'paid', 48998, 'comprador_juan', now - 2 * day, now - 2 * day),
      this.order('MOCK-ORD-0003', 'confirmed', 19999, 'comprador_lucia', now - 3 * day),
      this.order('MOCK-ORD-0004', 'cancelled', 12999, 'comprador_martin', now - 5 * day, now - 4 * day),
      this.order('MOCK-ORD-0005', 'paid', 34999, 'comprador_sofia', now - 6 * day, now - 6 * day),
      this.order('MOCK-ORD-0006', 'payment_required', 15999, 'comprador_diego', now - 7 * day),
      this.order('MOCK-ORD-0007', 'paid', 91998, 'comprador_valeria', now - 9 * day, now - 9 * day),
    ];
  }

  private fakeTokenSet(): MercadoLibreTokenSet {
    return {
      accessToken: `MOCK-ACCESS-${MOCK_ML_USER_ID}`,
      refreshToken: `MOCK-REFRESH-${MOCK_ML_USER_ID}`,
      expiresIn: 6 * 60 * 60,
      mlUserId: MOCK_ML_USER_ID,
      scope: 'offline_access read',
    };
  }

  private item(
    itemId: string,
    title: string,
    status: string,
    price: number,
    availableQuantity: number,
    soldQuantity: number,
  ): MercadoLibreListingData {
    return {
      itemId,
      title,
      status,
      price,
      currencyId: 'ARS',
      availableQuantity,
      soldQuantity,
      thumbnailUrl: undefined,
      permalink: `https://articulo.mercadolibre.com.ar/${itemId}`,
    };
  }

  private order(
    orderId: string,
    status: string,
    totalAmount: number,
    buyerNickname: string,
    dateCreatedMs: number,
    dateClosedMs?: number,
  ): MercadoLibreOrderData {
    return {
      orderId,
      status,
      totalAmount,
      currencyId: 'ARS',
      buyerNickname,
      dateCreated: new Date(dateCreatedMs),
      dateClosed: dateClosedMs ? new Date(dateClosedMs) : undefined,
    };
  }
}
