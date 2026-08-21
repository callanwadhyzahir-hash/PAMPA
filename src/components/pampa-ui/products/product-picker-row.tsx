import { cn } from '@/lib/utils';
import { ProductImage } from './product-image';

type ProductPickerRowProps = {
  imageUrl?: string | null;
  name: string;
  code: string;
  barcode?: string | null;
  /** Shown right-aligned when provided — e.g. stock quantity in a transfer/adjustment picker. */
  meta?: string | null;
  className?: string;
};

/**
 * Compact "[thumbnail] Name / SKU · barcode" row for product
 * selectors/autocompletes (sales, stock, Mercado Libre linking). Keeps the
 * three independent search implementations visually consistent without
 * forcing them onto one shared combobox component.
 */
function ProductPickerRow({
  imageUrl,
  name,
  code,
  barcode,
  meta,
  className,
}: ProductPickerRowProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <ProductImage src={imageUrl} alt={name} size="xs" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {code}
          {barcode ? ` · ${barcode}` : ''}
        </p>
      </div>
      {meta ? (
        <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>
      ) : null}
    </div>
  );
}

export { ProductPickerRow };
export type { ProductPickerRowProps };
