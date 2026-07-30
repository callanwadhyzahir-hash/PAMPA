import { apiFetch } from '@/services/api';

interface ApiEnvelope<T> {
  data: T;
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count: { product: number };
}

export interface ProductCategoryInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export const productCategoriesService = {
  async list(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return (
      await apiFetch<ApiEnvelope<ProductCategory[]>>(
        `/product-categories${query}`,
      )
    ).data;
  },
  async create(input: ProductCategoryInput) {
    return (
      await apiFetch<ApiEnvelope<ProductCategory>>('/product-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
  async update(id: string, input: Partial<ProductCategoryInput>) {
    return (
      await apiFetch<ApiEnvelope<ProductCategory>>(
        `/product-categories/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      )
    ).data;
  },
  remove(id: string) {
    return apiFetch<ApiEnvelope<{ status: 'DEACTIVATED' | 'DELETED' }>>(
      `/product-categories/${id}`,
      { method: 'DELETE' },
    );
  },
};
