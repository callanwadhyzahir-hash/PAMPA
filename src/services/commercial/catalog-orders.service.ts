import { apiFetch } from '@/services/api';

interface ApiEnvelope<T> {
  data: T;
}

export type CatalogOrderStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface CatalogOrderSummary {
  id: string;
  order_number: string;
  status: CatalogOrderStatus;
  customer_name: string;
  customer_phone: string;
  total: string;
  created_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  sale_id: string | null;
  _count: { catalog_order_item: number };
}

export interface CatalogOrderDetail {
  id: string;
  order_number: string;
  status: CatalogOrderStatus;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  notes: string | null;
  subtotal: string;
  total: string;
  created_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  client_id: string | null;
  sale_id: string | null;
  catalog: { id: string; display_name: string; slug: string };
  client: { id: string; code: string; first_name: string | null; last_name: string | null } | null;
  sale: {
    id: string;
    sale_number: string;
    status: string;
    total: string;
    confirmed_at: string | null;
  } | null;
  catalog_order_item: Array<{
    id: string;
    product_id: string;
    product_name: string;
    product_code: string;
    variant_label: string | null;
    quantity: string;
    unit_price: string;
    subtotal: string;
    product: { id: string; image_url: string | null; is_active: boolean };
  }>;
}

export const catalogOrdersService = {
  async list(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return (
      await apiFetch<ApiEnvelope<CatalogOrderSummary[]>>(
        `/catalog-orders${query}`,
      )
    ).data;
  },
  async get(id: string) {
    return (
      await apiFetch<ApiEnvelope<CatalogOrderDetail>>(`/catalog-orders/${id}`)
    ).data;
  },
  async accept(id: string) {
    return (
      await apiFetch<ApiEnvelope<CatalogOrderDetail>>(
        `/catalog-orders/${id}/accept`,
        { method: 'POST' },
      )
    ).data;
  },
  async reject(id: string, reason: string) {
    return (
      await apiFetch<ApiEnvelope<CatalogOrderDetail>>(
        `/catalog-orders/${id}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        },
      )
    ).data;
  },
};
