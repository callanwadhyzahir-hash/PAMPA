export const SALE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmada',
  PARTIALLY_PAID: 'Pago parcial',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada',
};

export function saleStatusLabel(status: string) {
  return SALE_STATUS_LABELS[status] ?? status;
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Completado',
  CANCELLED: 'Anulado',
  REFUNDED: 'Reembolsado',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  BANK_TRANSFER: 'Transferencia bancaria',
  DEBIT_CARD: 'Tarjeta de débito',
  CREDIT_CARD: 'Tarjeta de crédito',
  MERCADO_PAGO_MANUAL: 'Mercado Pago manual',
  OTHER: 'Otro',
};

export function paymentStatusLabel(status: string) {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

export function paymentMethodLabel(method: string) {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function snapshotText(
  snapshot: Record<string, unknown> | null,
  key: string,
) {
  const value = snapshot?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}
