import { apiFetch } from '@/services/api';

interface ApiEnvelope<T> {
  data: T;
}

export interface Catalog {
  id: string;
  company_id: string;
  branch_id: string;
  warehouse_id: string;
  slug: string;
  display_name: string;
  description: string | null;
  logo_url: string | null;
  whatsapp: string | null;
  contact_email: string | null;
  is_enabled: boolean;
  show_prices: boolean;
  show_availability: boolean;
  branch: { id: string; name: string; code: string };
  warehouse: { id: string; name: string; code: string };
}

export interface CatalogStatus {
  catalog: Catalog | null;
  publishedProducts: number;
  configured: boolean;
}

export interface UpsertCatalogInput {
  branchId: string;
  warehouseId: string;
  slug: string;
  displayName: string;
  description?: string;
  whatsapp?: string;
  contactEmail?: string;
  isEnabled: boolean;
  showPrices: boolean;
  showAvailability: boolean;
}

export const catalogService = {
  async getOwn() {
    return (await apiFetch<ApiEnvelope<CatalogStatus>>('/catalog')).data;
  },
  async upsert(input: UpsertCatalogInput) {
    return (
      await apiFetch<ApiEnvelope<Catalog>>('/catalog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
  async setProductsVisibility(productIds: string[], visible: boolean) {
    return (
      await apiFetch<ApiEnvelope<{ updated: number }>>(
        '/products/catalog-visibility',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds, visible }),
        },
      )
    ).data;
  },
};
