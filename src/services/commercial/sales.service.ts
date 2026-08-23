import { apiFetch } from '@/services/api';

interface ApiEnvelope<T> {
  data: T;
}

export interface SaleItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  variant_label: string | null;
  product_name: string;
  product_code: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  discount_percent: string;
  subtotal: string;
  total: string;
  product: { tracks_stock: boolean; unit: string };
}

export interface Payment {
  id: string;
  sale_id: string;
  payment_date: string;
  total: string;
  status: string;
  reference: string | null;
  notes: string | null;
  payment_item: Array<{
    id: string;
    payment_method: string;
    amount: string;
    transaction_reference: string | null;
  }>;
  sale?: {
    id: string;
    sale_number: string;
    total: string;
    status: string;
    client: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      business_name: string | null;
    } | null;
  };
  user?: { id: string; first_name: string; last_name: string };
}

export type FiscalStatus =
  | 'NOT_REQUESTED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ERROR';

export interface InternalInvoice {
  id: string;
  internal_number: string;
  document_label: string;
  status: string;
  issued_at: string;
  company_snapshot: Record<string, unknown>;
  client_snapshot: Record<string, unknown> | null;
  items_snapshot: Array<Record<string, string>>;
  totals_snapshot: Record<string, string>;
  fiscal_status: FiscalStatus;
  fiscal_provider: 'ARCA' | 'MOCK';
  invoice_number: string | null;
  point_of_sale: string | null;
  voucher_type_code: string | null;
  cae: string | null;
  cae_expiration: string | null;
  arca_error_code: string | null;
  arca_error_message: string | null;
}

export interface Sale {
  id: string;
  branch_id: string;
  warehouse_id: string;
  client_id: string | null;
  sale_number: string;
  sale_date: string;
  subtotal: string;
  tax_total: string;
  discount_total: string;
  total: string;
  status: string;
  notes: string | null;
  branch: { id: string; name: string; code: string };
  warehouse: { id: string; name: string; code: string };
  client: {
    id: string;
    code: string;
    first_name: string | null;
    last_name: string | null;
    business_name: string | null;
    tax_id: string | null;
    is_active: boolean;
  } | null;
  sale_item: SaleItem[];
  payment: Payment[];
  invoice: InternalInvoice | null;
}

export const salesService = {
  async list() {
    return (await apiFetch<ApiEnvelope<Sale[]>>('/sales')).data;
  },
  async get(id: string) {
    return (await apiFetch<ApiEnvelope<Sale>>(`/sales/${id}`)).data;
  },
  async create(input: {
    branchId: string;
    warehouseId: string;
    clientId?: string;
    notes?: string;
    items: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      discountPercent?: number;
    }>;
  }) {
    return (
      await apiFetch<ApiEnvelope<Sale>>('/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
  async confirm(id: string) {
    return (
      await apiFetch<ApiEnvelope<Sale>>(`/sales/${id}/confirm`, {
        method: 'POST',
      })
    ).data;
  },
  async cancel(id: string, reason: string) {
    return (
      await apiFetch<ApiEnvelope<Sale>>(`/sales/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
    ).data;
  },
  async fiscalize(id: string, forceOutcome?: 'APPROVED' | 'REJECTED') {
    return (
      await apiFetch<ApiEnvelope<unknown>>(`/sales/${id}/fiscalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forceOutcome ? { forceOutcome } : {}),
      })
    ).data;
  },
};

export const paymentsService = {
  async list() {
    return (await apiFetch<ApiEnvelope<Payment[]>>('/payments')).data;
  },
  async create(
    saleId: string,
    input: {
      items: Array<{ method: string; amount: number; reference?: string }>;
      notes?: string;
    },
  ) {
    return (
      await apiFetch<ApiEnvelope<Payment>>(`/sales/${saleId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
  cancel(id: string, reason: string) {
    return apiFetch<ApiEnvelope<Payment>>(`/payments/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
  },
  refund(id: string, reason: string) {
    return apiFetch<ApiEnvelope<Payment>>(`/payments/${id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
  },
};
