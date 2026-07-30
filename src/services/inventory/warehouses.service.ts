import { apiFetch } from '@/services/api';

interface ApiEnvelope<T> {
  data: T;
}

export interface Warehouse {
  id: string;
  branch_id: string;
  name: string;
  code: string;
  description: string | null;
  is_main: boolean;
  is_active: boolean;
  product_count: number;
  stored_units: string;
  branch: { id: string; name: string; code: string; is_active: boolean };
  _count: { stock_movement: number };
}

export interface WarehouseInput {
  branchId: string;
  name: string;
  code: string;
  description?: string;
  isMain?: boolean;
  isActive?: boolean;
}

export const warehousesService = {
  async list(branchId?: string) {
    const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return (
      await apiFetch<ApiEnvelope<Warehouse[]>>(`/warehouses${query}`)
    ).data;
  },
  async create(input: WarehouseInput) {
    return (
      await apiFetch<ApiEnvelope<Warehouse>>('/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
  async update(id: string, input: Partial<WarehouseInput>) {
    return (
      await apiFetch<ApiEnvelope<Warehouse>>(`/warehouses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
  deactivate(id: string) {
    return apiFetch<ApiEnvelope<{ status: 'DEACTIVATED' }>>(
      `/warehouses/${id}`,
      { method: 'DELETE' },
    );
  },
};
