export interface DraftItem {
  productId: string;
  quantity: string;
  discountPercent: string;
}

/**
 * Adds a scanned/selected product to the draft cart: increments quantity by
 * one if it's already there, otherwise appends it with quantity 1. Used by
 * both manual selection and barcode scan-to-add so re-scanning the same
 * product behaves like clicking it again.
 */
export function addProductToDraft(
  items: DraftItem[],
  productId: string,
): DraftItem[] {
  const existing = items.find((item) => item.productId === productId);
  if (existing) {
    return items.map((item) =>
      item.productId === productId
        ? { ...item, quantity: String(Number(item.quantity) + 1) }
        : item,
    );
  }
  return [...items, { productId, quantity: '1', discountPercent: '0' }];
}
