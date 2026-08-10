export type BarcodeFormat = 'EAN13' | 'EAN8' | 'UPC' | 'CODE128';

function isDigitsOnly(value: string): boolean {
  return /^\d+$/.test(value);
}

/**
 * GS1 mod-10 check digit used by EAN-13, EAN-8 and UPC-A alike: weight the
 * digits 3/1 alternating from the one adjacent to the check digit.
 */
function hasValidGtinCheckDigit(digits: string): boolean {
  const values = digits.split('').map(Number);
  const checkDigit = values.pop();
  if (checkDigit === undefined) return false;
  const sum = values
    .reverse()
    .reduce(
      (total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1),
      0,
    );
  const computed = (10 - (sum % 10)) % 10;
  return computed === checkDigit;
}

/**
 * Picks the barcode symbology to render for an existing product code.
 * Only claims EAN-13/EAN-8/UPC-A when the value has the right length AND a
 * valid GTIN check digit — otherwise it falls back to Code 128, which can
 * encode any value without asserting it is a valid EAN/UPC.
 */
export function detectBarcodeFormat(value: string): BarcodeFormat {
  if (isDigitsOnly(value)) {
    if (value.length === 13 && hasValidGtinCheckDigit(value)) return 'EAN13';
    if (value.length === 12 && hasValidGtinCheckDigit(value)) return 'UPC';
    if (value.length === 8 && hasValidGtinCheckDigit(value)) return 'EAN8';
  }
  return 'CODE128';
}

const INTERNAL_BARCODE_PATTERN = /^PMP-[A-Z0-9]{12}$/;

/** Recognizes PAMPA's own internally generated barcode namespace. */
export function isInternalBarcode(value: string): boolean {
  return INTERNAL_BARCODE_PATTERN.test(value);
}
