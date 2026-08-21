import { apiFetch } from "@/services/api";

interface ApiEnvelope<T> {
  data: T;
}

export interface DashboardMetrics {
  salesToday: string;
  salesMonth: string;
  salesCount: number;
  salesPeriod: string;
  collected: string;
  pending: string;
  activeClients: number;
  activeBranches: number;
  lowStock: number;
  outOfStock: number;
  recentSales: Array<{
    id: string;
    sale_number: string;
    sale_date: string;
    total: string;
    status: string;
    client: {
      first_name: string | null;
      last_name: string | null;
      business_name: string | null;
    } | null;
  }>;
  recentMovements: Array<{
    id: string;
    movement_type: string;
    quantity: string;
    created_at: string;
    product: { name: string; code: string; image_url: string | null };
    warehouse: { name: string; code: string };
  }>;
}

export interface ReportsData {
  salesByPeriod: Array<{ date: string; count: number; total: string }>;
  salesByBranch: Array<{
    id: string;
    name: string;
    count: number;
    total: string;
  }>;
  salesByProduct: Array<{
    productId: string;
    productName: string;
    quantity: string;
    total: string;
  }>;
  paymentsByMethod: Array<{ method: string; total: string }>;
  salesByClient: Array<{
    clientName: string;
    count: number;
    total: string;
  }>;
  stockMovements: Array<{
    date: string;
    type: string;
    quantity: string;
    reference: string | null;
    productCode: string;
    productName: string;
    warehouseName: string;
  }>;
  pendingBalances: Array<{
    id: string;
    saleNumber: string;
    date: string;
    total: string;
    balance: string;
    clientName: string;
  }>;
  stock: StockReportRow[];
  lowStock: StockReportRow[];
}

export interface StockReportRow {
  quantity: string;
  minimum_quantity: string;
  product: { code: string; name: string; unit: string };
  warehouse: { code: string; name: string };
}

function queryString(values: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export const analyticsService = {
  async dashboard(range: string, branchId?: string) {
    const query = queryString({ range, branchId });
    return (
      await apiFetch<ApiEnvelope<DashboardMetrics>>(
        `/dashboard/metrics${query}`,
      )
    ).data;
  },
  async reports(from: string, to: string, branchId?: string) {
    const query = queryString({ from, to, branchId });
    return (await apiFetch<ApiEnvelope<ReportsData>>(`/reports${query}`)).data;
  },
};
