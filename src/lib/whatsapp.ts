const MIN_DIGITS = 8;
const MAX_DIGITS = 15;
// A local AR number (area code + subscriber, no country code) is at most
// this many digits — e.g. Buenos Aires "11 5869 6318" is 10. Above this we
// can no longer tell a bare local number from a full foreign number, so we
// leave it untouched rather than guess.
const MAX_LOCAL_AR_DIGITS = 11;

/**
 * Strips a free-typed phone number down to the digits wa.me expects, and
 * fixes it up into the country-code-plus-9 shape WhatsApp requires for
 * Argentine mobiles (PAMPA is an AR-only product — every merchant and
 * customer number here is Argentine). Without the leading "549", wa.me
 * misreads the area code as a country code (e.g. "1158696318" opens as
 * +1 158-696-318, a US number that "isn't on WhatsApp"), which is the
 * actual bug this normalization exists to prevent — not just cosmetics.
 * Returns null when there aren't enough digits to be a real number.
 */
export function normalizeWhatsappDigits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) digits = digits.slice(2);

  if (digits.startsWith('54')) {
    let rest = digits.slice(2);
    if (!rest.startsWith('9')) rest = `9${rest}`;
    digits = `54${rest}`;
  } else if (digits.length <= MAX_LOCAL_AR_DIGITS) {
    if (digits.startsWith('0')) digits = digits.slice(1);
    digits = `549${digits}`;
  }

  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null;
  return digits;
}

export function buildWhatsAppUrl(phoneDigits: string, message: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

export interface OrderWhatsAppMessageInput {
  companyName: string;
  orderNumber: string;
  items: Array<{
    productName: string;
    variantLabel?: string | null;
    quantity: string | number;
    subtotal?: string | number | null;
  }>;
  total?: string | number | null;
  customerName?: string | null;
  customerPhone?: string | null;
}

export function buildOrderWhatsAppMessage(input: OrderWhatsAppMessageInput): string {
  const lines: string[] = [];
  lines.push(`Hola, ${input.companyName}. Quiero confirmar mi pedido ${input.orderNumber}:`);
  lines.push('');
  for (const item of input.items) {
    const label = item.variantLabel ? `${item.productName} (${item.variantLabel})` : item.productName;
    const price = item.subtotal != null ? ` — $${item.subtotal}` : '';
    lines.push(`• ${label} x${item.quantity}${price}`);
  }
  if (input.total != null) {
    lines.push('');
    lines.push(`Total: $${input.total}`);
  }
  if (input.customerName || input.customerPhone) {
    lines.push('');
    if (input.customerName) lines.push(`Cliente: ${input.customerName}`);
    if (input.customerPhone) lines.push(`Teléfono: ${input.customerPhone}`);
  }
  lines.push('');
  lines.push('Pedido realizado desde el catálogo online de PAMPA.');
  return lines.join('\n');
}
