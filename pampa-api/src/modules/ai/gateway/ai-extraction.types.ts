import { AiInvalidResponseError } from '../ai.errors';

export interface AiExtractionInput {
  text?: string;
  image?: { mimeType: string; dataBase64: string };
}

/**
 * One line item as the model sees it — deliberately shaped after PAMPA's
 * real product/stock fields (see product/product_variant/stock in
 * schema.prisma), not a generic invoice-line schema. `size`/`color` map
 * onto a single product_variant.label at import time (PAMPA has no
 * separate size/color columns), everything else maps 1:1 onto
 * CreateProductDto / StockAdjustmentDto fields.
 */
export interface AiExtractedProduct {
  name: string;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  category: string | null;
  size: string | null;
  color: string | null;
  description: string | null;
  price: number | null;
  stock: number | null;
}

export interface AiExtractionResult {
  products: AiExtractedProduct[];
  /** Which provider actually served this — set by the gateway after a successful call, never guessed downstream (AiInvalidResponseError never carries one). */
  provider: string;
}

const STRING_FIELDS = [
  'sku',
  'barcode',
  'brand',
  'category',
  'size',
  'color',
  'description',
] as const;

/**
 * The only place that trusts model output enough to turn it into typed
 * data — everything here is hostile input until proven otherwise. Never
 * throws on malformed shapes; always AiInvalidResponseError, so the
 * gateway's billing/audit path (which needs to know "did we get a usable
 * answer") stays a single catch.
 */
export function parseExtractionResponse(
  raw: string | null,
  provider: string,
): AiExtractionResult {
  if (!raw) throw new AiInvalidResponseError();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AiInvalidResponseError();
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('products' in parsed) ||
    !Array.isArray(parsed.products)
  ) {
    throw new AiInvalidResponseError();
  }

  const products = (parsed as { products: unknown[] }).products
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null,
    )
    .map(toExtractedProduct)
    .filter((item): item is AiExtractedProduct => item !== null);

  return { products, provider };
}

function toExtractedProduct(
  item: Record<string, unknown>,
): AiExtractedProduct | null {
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  if (!name) return null;

  const result: AiExtractedProduct = {
    name,
    sku: null,
    barcode: null,
    brand: null,
    category: null,
    size: null,
    color: null,
    description: null,
    price: toPositiveNumberOrNull(item.price),
    stock: toPositiveNumberOrNull(item.stock),
  };
  for (const field of STRING_FIELDS) {
    result[field] = toTrimmedStringOrNull(item[field]);
  }
  return result;
}

function toTrimmedStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function toPositiveNumberOrNull(value: unknown): number | null {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) && num >= 0 ? num : null;
}
