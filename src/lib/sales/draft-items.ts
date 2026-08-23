export interface DraftItem {
  productId: string;
  variantId?: string;
  quantity: string;
  discountPercent: string;
}

/**
 * Adds a scanned/selected product to the draft cart: increments quantity by
 * one if it's already there, otherwise appends it with quantity 1. Used by
 * both manual selection and barcode scan-to-add so re-scanning the same
 * product behaves like clicking it again. Matches on (productId, variantId)
 * so two variants of the same product are separate lines.
 */
export function addProductToDraft(
  items: DraftItem[],
  productId: string,
  variantId?: string,
): DraftItem[] {
  const existing = items.find(
    (item) => item.productId === productId && item.variantId === variantId,
  );
  if (existing) {
    return items.map((item) =>
      item.productId === productId && item.variantId === variantId
        ? { ...item, quantity: String(Number(item.quantity) + 1) }
        : item,
    );
  }
  return [
    ...items,
    {
      productId,
      ...(variantId ? { variantId } : {}),
      quantity: '1',
      discountPercent: '0',
    },
  ];
}
