import { apiFetch } from '@/services/api';

interface ApiEnvelope<T> {
  data: T;
}

export type SmartImportWarning =
  | 'DUPLICATE_BARCODE'
  | 'POSSIBLE_DUPLICATE_NAME'
  | 'MISSING_PRICE'
  | 'MISSING_STOCK'
  | 'CATEGORY_NOT_FOUND';

export interface SmartImportPreviewItem {
  name: string;
  code: string;
  barcode: string | null;
  brand: string | null;
  category: string | null;
  categoryId: string | null;
  variantLabel: string | null;
  description: string | null;
  price: number | null;
  stock: number | null;
  warnings: SmartImportWarning[];
  status: 'VALID' | 'WARNING';
}

export interface SmartImportPreview {
  items: SmartImportPreviewItem[];
  provider: string;
}

export interface ConfirmImportItem {
  name: string;
  code?: string;
  barcode?: string;
  categoryId?: string;
  variantLabel?: string;
  description?: string;
  salePrice: number;
  stock?: number;
}

export interface SmartImportConfirmResultItem {
  name: string;
  status: 'CREATED' | 'ERROR';
  productId?: string;
  variantId?: string;
  error?: string;
}

export interface SmartImportConfirmResult {
  created: number;
  failed: number;
  items: SmartImportConfirmResultItem[];
}

export const smartImportService = {
  async extractFromText(text: string) {
    return (
      await apiFetch<ApiEnvelope<SmartImportPreview>>(
        '/inventory/smart-import/extract-text',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        },
      )
    ).data;
  },
  async extractFromImage(file: File, text?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (text) formData.append('text', text);
    return (
      await apiFetch<ApiEnvelope<SmartImportPreview>>(
        '/inventory/smart-import/extract-image',
        { method: 'POST', body: formData },
      )
    ).data;
  },
  async confirm(warehouseId: string, items: ConfirmImportItem[]) {
    return (
      await apiFetch<ApiEnvelope<SmartImportConfirmResult>>(
        '/inventory/smart-import/confirm',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ warehouseId, items }),
        },
      )
    ).data;
  },
};
