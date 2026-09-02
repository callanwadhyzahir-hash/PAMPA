const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

/**
 * Strips a free-typed phone number down to the digits wa.me expects.
 * Returns null when there aren't enough digits to be a real number, so
 * callers never build a WhatsApp link out of garbage input.
 */
export function normalizeWhatsappDigits(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, '');
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
