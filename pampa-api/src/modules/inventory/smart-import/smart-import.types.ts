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
