import { BarcodeImage } from './barcode-image';

interface BarcodeLabelProps {
  barcode: string;
  productName: string;
  sku?: string;
  price?: string;
  showName?: boolean;
  showSku?: boolean;
  showPrice?: boolean;
}

/** A single printable label: barcode graphic, human-readable value, and product info. */
function BarcodeLabel({
  barcode,
  productName,
  sku,
  price,
  showName = true,
  showSku = true,
  showPrice = true,
}: BarcodeLabelProps) {
  return (
    <div className="flex w-[220px] flex-col items-center gap-1 border border-dashed p-2 text-center break-inside-avoid">
      {showName ? (
        <p className="w-full truncate text-xs font-semibold">{productName}</p>
      ) : null}
      <BarcodeImage
        value={barcode}
        height={45}
        width={1.6}
        displayValue
        className="max-w-full"
      />
      <div className="flex w-full items-center justify-center gap-2 text-[10px] text-muted-foreground">
        {showSku && sku ? <span>SKU {sku}</span> : null}
        {showPrice && price ? <span>{price}</span> : null}
      </div>
    </div>
  );
}

export { BarcodeLabel };
export type { BarcodeLabelProps };
