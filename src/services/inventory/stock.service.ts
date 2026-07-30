import { apiFetch } from '@/services/api';

interface ApiEnvelope<T> {
  data: T;
}

export interface StockRow {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: string;
  minimum_quantity: string;
  maximum_quantity: string | null;
  product: {
    id: string;
    code: string;
    barcode: string | null;
    name: string;
    unit: string;
    tracks_stock: boolean;
    is_active: boolean;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
    branch_id: string;
    is_active: boolean;
    branch: { id: string; name: string; code: string };
  };
}

export interface StockMovement {
  id: string;
  movement_type: string;
  quantity: string;
  reference_code: string | null;
  origin: string;
  observations: string | null;
  created_at: string;
  product: { id: string; code: string; name: string; unit: string };
  warehouse: { id: string; code: string; name: string };
  user: { id: string; first_name: string; last_name: string } | null;
}

export interface StockSummary {
  positions: number;
  products: number;
  warehouses: number;
  units: string;
  lowStock: number;
  outOfStock: number;
}

export const stockService = {
  async list(filters?: { productId?: string; warehouseId?: string }) {
    const query = new URLSearchParams();
    if (filters?.productId) query.set('productId', filters.productId);
    if (filters?.warehouseId) query.set('warehouseId', filters.warehouseId);
    const suffix = query.size ? `?${query.toString()}` : '';
    return (await apiFetch<ApiEnvelope<StockRow[]>>(`/stock${suffix}`)).data;
  },
  async summary() {
    return (await apiFetch<ApiEnvelope<StockSummary>>('/stock/summary')).data;
  },
  async movements(filters?: { productId?: string; warehouseId?: string }) {
    const query = new URLSearchParams();
    if (filters?.productId) query.set('productId', filters.productId);
    if (filters?.warehouseId) query.set('warehouseId', filters.warehouseId);
    const suffix = query.size ? `?${query.toString()}` : '';
    return (
      await apiFetch<ApiEnvelope<StockMovement[]>>(
        `/stock-movements${suffix}`,
      )
    ).data;
  },
  adjust(input: {
    productId: string;
    warehouseId: string;
    movementType:
      | 'INITIAL'
      | 'ADJUSTMENT_IN'
      | 'ADJUSTMENT_OUT'
      | 'RETURN_IN'
      | 'RETURN_OUT';
    quantity: number;
    reason: string;
  }) {
    return apiFetch<ApiEnvelope<unknown>>('/stock/adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
  transfer(input: {
    productId: string;
    sourceWarehouseId: string;
    targetWarehouseId: string;
    quantity: number;
    reason: string;
  }) {
    return apiFetch<ApiEnvelope<unknown>>('/stock/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
};
