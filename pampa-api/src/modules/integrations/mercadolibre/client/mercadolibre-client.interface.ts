export interface MercadoLibreTokenSet {
  accessToken: string;
  refreshToken: string;
  /** Seconds until expiration, as returned by Mercado Libre. */
  expiresIn: number;
  /** Mercado Libre user (seller) ID tied to this token. */
  mlUserId: string;
  scope?: string;
}

export interface MercadoLibreUserInfo {
  id: string;
  nickname: string;
  siteId: string;
}

export interface MercadoLibreListingData {
  itemId: string;
  title: string;
  status: string;
  price: number;
  currencyId: string;
  availableQuantity: number;
  soldQuantity: number;
  thumbnailUrl?: string;
  permalink?: string;
}

export interface MercadoLibreOrderData {
  orderId: string;
  status: string;
  totalAmount: number;
  currencyId: string;
  buyerNickname?: string;
  dateCreated: Date;
  dateClosed?: Date;
}

/**
 * The only door PAMPA has to Mercado Libre's API. No other module may fetch
 * ML endpoints directly. Two implementations exist:
 * RealMercadoLibreClient (actual HTTPS calls) and MockMercadoLibreClient
 * (fixtures, development only) — selected once at module boot by
 * MercadoLibreModule based on MercadoLibreConfigService.mockMode.
 */
export interface MercadoLibreClient {
  exchangeAuthorizationCode(params: {
    code: string;
    codeVerifier: string;
  }): Promise<MercadoLibreTokenSet>;

  refreshAccessToken(refreshToken: string): Promise<MercadoLibreTokenSet>;

  getUserInfo(accessToken: string): Promise<MercadoLibreUserInfo>;

  listUserItems(params: {
    accessToken: string;
    sellerId: string;
  }): Promise<MercadoLibreListingData[]>;

  listOrders(params: {
    accessToken: string;
    sellerId: string;
  }): Promise<MercadoLibreOrderData[]>;
}
