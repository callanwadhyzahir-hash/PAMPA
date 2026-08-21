import { apiFetch } from '@/services/api';

interface ApiEnvelope<T> {
  data: T;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface MercadoLibreAccount {
  provider: 'REAL' | 'MOCK';
  nickname: string;
  mlUserId: string;
  siteId: string;
  status: string;
}

export interface MercadoLibreStatus {
  configured: boolean;
  mockMode: boolean;
  connected: boolean;
  account: MercadoLibreAccount | null;
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface MercadoLibreConnectResult {
  authorizationUrl?: string;
  connected?: boolean;
  mock?: boolean;
}

export interface MercadoLibreListingLink {
  id: string;
  product_id: string;
  product: { id: string; name: string; code: string; image_url: string | null };
}

export interface MercadoLibreListing {
  id: string;
  ml_item_id: string;
  title: string;
  status: string;
  price: string;
  currency_id: string;
  available_quantity: number;
  sold_quantity: number;
  thumbnail_url: string | null;
  permalink: string | null;
  last_synced_at: string;
  mercadolibre_product_link: MercadoLibreListingLink | null;
}

export interface MercadoLibreOrder {
  id: string;
  ml_order_id: string;
  status: string;
  total_amount: string;
  currency_id: string;
  buyer_nickname: string | null;
  date_created: string;
  date_closed: string | null;
  last_synced_at: string;
}

export interface MercadoLibreSyncResult {
  syncedAt: string;
  listingsSynced: number;
  ordersSynced: number;
}

export const mercadolibreService = {
  async getStatus() {
    return (
      await apiFetch<ApiEnvelope<MercadoLibreStatus>>(
        '/integrations/mercadolibre/status',
      )
    ).data;
  },

  async connect() {
    return (
      await apiFetch<ApiEnvelope<MercadoLibreConnectResult>>(
        '/integrations/mercadolibre/connect',
      )
    ).data;
  },

  async disconnect() {
    await apiFetch<void>('/integrations/mercadolibre/disconnect', {
      method: 'POST',
    });
  },

  async sync() {
    return (
      await apiFetch<ApiEnvelope<MercadoLibreSyncResult>>(
        '/integrations/mercadolibre/sync',
        { method: 'POST' },
      )
    ).data;
  },

  async listListings(params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    query.set('page', String(params?.page ?? 1));
    query.set('limit', String(params?.limit ?? 20));
    return (
      await apiFetch<ApiEnvelope<{ items: MercadoLibreListing[]; pagination: Pagination }>>(
        `/integrations/mercadolibre/listings?${query.toString()}`,
      )
    ).data;
  },

  async listOrders(params?: { status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    query.set('page', String(params?.page ?? 1));
    query.set('limit', String(params?.limit ?? 20));
    return (
      await apiFetch<ApiEnvelope<{ items: MercadoLibreOrder[]; pagination: Pagination }>>(
        `/integrations/mercadolibre/orders?${query.toString()}`,
      )
    ).data;
  },

  async linkListing(listingId: string, productId: string) {
    return (
      await apiFetch<ApiEnvelope<MercadoLibreListingLink>>(
        `/integrations/mercadolibre/listings/${listingId}/link`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        },
      )
    ).data;
  },

  async unlinkListing(listingId: string) {
    await apiFetch<void>(`/integrations/mercadolibre/listings/${listingId}/link`, {
      method: 'DELETE',
    });
  },
};
