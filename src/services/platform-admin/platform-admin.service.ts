import { apiFetch } from "@/services/api";

interface ApiEnvelope<T> {
  data: T;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PlatformOverview {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalUsers: number;
  activeUsers: number;
  totalBranches: number;
  totalProducts: number;
  totalClients: number;
  totalSales: number;
}

export interface PlatformCompanyRow {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  usersCount: number;
  branchesCount: number;
  productsCount: number;
  clientsCount: number;
  salesCount: number;
  lastSaleAt: string | null;
}

export interface PlatformCompanyDetail {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  counts: {
    users: number;
    activeUsers: number;
    branches: number;
    warehouses: number;
    products: number;
    clients: number;
    sales: number;
    payments: number;
    stockMovements: number;
  };
}

export interface PlatformUserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  company: { id: string; name: string };
}

interface CompanyPage {
  items: PlatformCompanyRow[];
  pagination: Pagination;
}

interface UserPage {
  items: PlatformUserRow[];
  pagination: Pagination;
}

export const platformAdminService = {
  async overview() {
    return (await apiFetch<ApiEnvelope<PlatformOverview>>("/platform-admin/overview")).data;
  },

  async listCompanies(params?: {
    search?: string;
    status?: "ACTIVE" | "SUSPENDED";
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    query.set("page", String(params?.page ?? 1));
    query.set("limit", String(params?.limit ?? 20));
    return (
      await apiFetch<ApiEnvelope<CompanyPage>>(`/platform-admin/companies?${query.toString()}`)
    ).data;
  },

  async getCompany(id: string) {
    return (
      await apiFetch<ApiEnvelope<PlatformCompanyDetail>>(`/platform-admin/companies/${id}`)
    ).data;
  },

  async updateCompanyStatus(id: string, input: { isActive: boolean; reason?: string }) {
    return (
      await apiFetch<ApiEnvelope<{ id: string; name: string; isActive: boolean }>>(
        `/platform-admin/companies/${id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      )
    ).data;
  },

  async listUsers(params?: { search?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    query.set("page", String(params?.page ?? 1));
    query.set("limit", String(params?.limit ?? 20));
    return (
      await apiFetch<ApiEnvelope<UserPage>>(`/platform-admin/users?${query.toString()}`)
    ).data;
  },
};
