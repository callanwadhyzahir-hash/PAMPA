'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

import { detectBarcodeFormat, type BarcodeFormat } from '@/lib/barcode/format';

interface BarcodeImageProps {
  value: string;
  /** Overrides auto-detection (see detectBarcodeFormat). */
  format?: BarcodeFormat;
  height?: number;
  /** Width of the narrowest bar, in px. */
  width?: number;
  displayValue?: boolean;
  className?: string;
}

/**
 * Renders a Code 128 barcode for PAMPA's internal codes, or the matching
 * EAN-13/EAN-8/UPC-A symbology for factory codes when the value's check
 * digit confirms it — see `detectBarcodeFormat`.
 */
function BarcodeImage({
  value,
  format,
  height = 60,
  width = 2,
  displayValue = true,
  className,
}: BarcodeImageProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !value) return;
    const options = { height, width, displayValue, margin: 8 };
    try {
      JsBarcode(svg, value, {
        format: format ?? detectBarcodeFormat(value),
        ...options,
      });
    } catch {
      // The detected/forced format rejected this value (e.g. a bad check
      // digit slipping through); Code 128 encodes any string, so it never
      // fails here for a non-empty value.
      JsBarcode(svg, value, { format: 'CODE128', ...options });
    }
  }, [value, format, height, width, displayValue]);

  if (!value) return null;

  return (
    <svg
      ref={svgRef}
      className={className}
      role="img"
      aria-label={`Código de barras ${value}`}
    />
  );
}

export { BarcodeImage };
export type { BarcodeImageProps };
