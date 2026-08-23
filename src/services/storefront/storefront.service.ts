import { storefrontFetch } from '@/lib/storefront-api';

export type Availability = 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | null;

export interface StorefrontCatalog {
  slug: string;
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  whatsapp: string | null;
  showPrices: boolean;
  showAvailability: boolean;
}

export interface StorefrontCategory {
  id: string;
  name: string;
}

export interface StorefrontVariant {
  id: string;
  label: string;
  availability: Availability;
  inStock: boolean;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  imageUrl: string | null;
  featured: boolean;
  category: StorefrontCategory | null;
  price: string | null;
  availability: Availability;
  inStock: boolean;
  variants: StorefrontVariant[] | null;
}

export interface StorefrontProductPage {
  items: StorefrontProduct[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface SubmitOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  items: Array<{ productId: string; variantId?: string; quantity: number }>;
}

export interface SubmitOrderResult {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  items: Array<{
    productName: string;
    variantLabel: string | null;
    quantity: string;
    unitPrice: string;
    subtotal: string;
  }>;
}

export const storefrontService = {
  getCatalog(slug: string) {
    return storefrontFetch<StorefrontCatalog>(`/${encodeURIComponent(slug)}`);
  },
  listCategories(slug: string) {
    return storefrontFetch<StorefrontCategory[]>(
      `/${encodeURIComponent(slug)}/categories`,
    );
  },
  listProducts(
    slug: string,
    params?: { search?: string; categoryId?: string; page?: number },
  ) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    query.set('page', String(params?.page ?? 1));
    query.set('limit', '24');
    return storefrontFetch<StorefrontProductPage>(
      `/${encodeURIComponent(slug)}/products?${query.toString()}`,
    );
  },
  getProduct(slug: string, productId: string) {
    return storefrontFetch<StorefrontProduct>(
      `/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}`,
    );
  },
  submitOrder(slug: string, input: SubmitOrderInput) {
    return storefrontFetch<SubmitOrderResult>(`/${encodeURIComponent(slug)}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
};
