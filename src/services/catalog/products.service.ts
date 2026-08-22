import { apiFetch } from '@/services/api';

interface ApiEnvelope<T> {
  data: T;
}

export interface Product {
  id: string;
  category_id: string | null;
  code: string;
  barcode: string | null;
  name: string;
  description: string | null;
  product_type: string;
  unit: string;
  cost: string;
  sale_price: string;
  tax_rate: string;
  tracks_stock: boolean;
  is_active: boolean;
  image_url: string | null;
  catalog_visible: boolean;
  catalog_featured: boolean;
  catalog_position: number;
  total_stock: string;
  minimum_stock: string;
  low_stock: boolean;
  product_category: {
    id: string;
    name: string;
    is_active: boolean;
  } | null;
  company: {
    currency: {
      id: string;
      code: string;
      name: string;
      symbol: string | null;
    };
  };
}

export interface ProductInput {
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId?: string;
  productType?: 'PRODUCT' | 'SERVICE';
  unit?: string;
  cost: number;
  salePrice: number;
  taxRate?: number;
  tracksStock?: boolean;
  isActive?: boolean;
}

interface ProductPage {
  items: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const productsService = {
  async list(params?: {
    search?: string;
    categoryId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    if (params?.isActive !== undefined) {
      query.set('isActive', String(params.isActive));
    }
    query.set('page', String(params?.page ?? 1));
    query.set('limit', String(params?.limit ?? 20));
    return (
      await apiFetch<ApiEnvelope<ProductPage>>(`/products?${query.toString()}`)
    ).data;
  },
  async findByBarcode(barcode: string) {
    return (
      await apiFetch<ApiEnvelope<Product>>(
        `/products/barcode/${encodeURIComponent(barcode)}`,
      )
    ).data;
  },
  async generateBarcode() {
    return (
      await apiFetch<ApiEnvelope<{ barcode: string }>>(
        '/products/barcode/generate',
        { method: 'POST' },
      )
    ).data;
  },
  async create(input: ProductInput) {
    return (
      await apiFetch<ApiEnvelope<Product>>('/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
  async update(id: string, input: Partial<ProductInput>) {
    return (
      await apiFetch<ApiEnvelope<Product>>(`/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
  deactivate(id: string) {
    return apiFetch<ApiEnvelope<Product>>(`/products/${id}`, {
      method: 'DELETE',
    });
  },
  async uploadImage(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return (
      await apiFetch<ApiEnvelope<{ id: string; imageUrl: string }>>(
        `/products/${id}/image`,
        { method: 'POST', body: formData },
      )
    ).data;
  },
  async removeImage(id: string) {
    return (
      await apiFetch<ApiEnvelope<{ id: string; imageUrl: null }>>(
        `/products/${id}/image`,
        { method: 'DELETE' },
      )
    ).data;
  },
};
