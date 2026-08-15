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

export interface PlatformSecuritySummary {
  users: {
    total: number;
    pendingVerification: number;
    verified: number;
    deactivated: number;
  };
  emails: {
    sentLast7d: number;
    verifiedLast7d: number;
    deliveryFailuresLast7d: number;
    deliveryFailuresLast30d: number;
  };
  auth: {
    failedLoginsLast24h: number;
    failedLoginsLast7d: number;
  };
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

export interface PlatformCompanyOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
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
  owners: PlatformCompanyOwner[];
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

export interface PlatformUserDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string; isActive: boolean };
  branch: { id: string; name: string } | null;
  roles: { id: string; name: string; systemCode: string | null }[];
}

interface CompanyPage {
  items: PlatformCompanyRow[];
  pagination: Pagination;
}

interface UserPage {
  items: PlatformUserRow[];
  pagination: Pagination;
}

export interface PlatformActivityActor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface PlatformActivityEvent {
  id: string;
  eventType: string;
  result: "SUCCESS" | "FAILURE" | "BLOCKED";
  createdAt: string;
  metadata: unknown;
  company: { id: string; name: string } | null;
  actor: PlatformActivityActor | null;
  target: PlatformActivityActor | null;
}

interface ActivityPage {
  items: PlatformActivityEvent[];
  pagination: Pagination;
}

export interface PlatformGrowthPoint {
  date: string;
  newUsers: number;
  newCompanies: number;
  logins: number;
}

export interface PlatformGrowthSeries {
  days: number;
  series: PlatformGrowthPoint[];
}

export type PlatformComponentStatus = "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "UNKNOWN";

export interface PlatformSystemStatus {
  status: PlatformComponentStatus;
  timestamp: string;
  environment: string | null;
  version: string | null;
  commit: string | null;
  uptimeSeconds: number;
  api: { status: PlatformComponentStatus };
  database: { status: PlatformComponentStatus; latencyMs: number | null };
  migrations: {
    status: PlatformComponentStatus;
    appliedCount: number | null;
    latestMigration: string | null;
    latestAppliedAt: string | null;
    pending: boolean | null;
  };
  email: {
    status: PlatformComponentStatus;
    configured: boolean;
    deliveryFailuresLast7d: number;
  };
}

export const platformAdminService = {
  async overview() {
    return (await apiFetch<ApiEnvelope<PlatformOverview>>("/platform-admin/overview")).data;
  },

  async securitySummary() {
    return (
      await apiFetch<ApiEnvelope<PlatformSecuritySummary>>("/platform-admin/security")
    ).data;
  },

  async growth(days: 7 | 30 | 90 = 30) {
    return (
      await apiFetch<ApiEnvelope<PlatformGrowthSeries>>(`/platform-admin/overview/growth?days=${days}`)
    ).data;
  },

  async listCompanies(params?: {
    search?: string;
    status?: "ACTIVE" | "SUSPENDED";
    hasUsers?: "WITH" | "WITHOUT";
    createdWithinDays?: 7 | 30 | 90;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    if (params?.hasUsers) query.set("hasUsers", params.hasUsers);
    if (params?.createdWithinDays) query.set("createdWithinDays", String(params.createdWithinDays));
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

  async listUsers(params?: {
    search?: string;
    status?: "ACTIVE" | "INACTIVE";
    emailVerified?: "VERIFIED" | "PENDING";
    roleCode?: string;
    neverLoggedIn?: boolean;
    createdWithinDays?: 7 | 30 | 90;
    sortBy?: "createdAt" | "lastLoginAt" | "firstName" | "company";
    sortDir?: "asc" | "desc";
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    if (params?.emailVerified) query.set("emailVerified", params.emailVerified);
    if (params?.roleCode) query.set("roleCode", params.roleCode);
    if (params?.neverLoggedIn) query.set("neverLoggedIn", "true");
    if (params?.createdWithinDays) query.set("createdWithinDays", String(params.createdWithinDays));
    if (params?.sortBy) query.set("sortBy", params.sortBy);
    if (params?.sortDir) query.set("sortDir", params.sortDir);
    query.set("page", String(params?.page ?? 1));
    query.set("limit", String(params?.limit ?? 20));
    return (
      await apiFetch<ApiEnvelope<UserPage>>(`/platform-admin/users?${query.toString()}`)
    ).data;
  },

  async listActivity(params?: {
    eventTypes?: string[];
    result?: "SUCCESS" | "FAILURE" | "BLOCKED";
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.eventTypes?.length) query.set("eventTypes", params.eventTypes.join(","));
    if (params?.result) query.set("result", params.result);
    if (params?.userId) query.set("userId", params.userId);
    query.set("page", String(params?.page ?? 1));
    query.set("limit", String(params?.limit ?? 30));
    return (
      await apiFetch<ApiEnvelope<ActivityPage>>(`/platform-admin/activity?${query.toString()}`)
    ).data;
  },

  async getUser(id: string) {
    return (
      await apiFetch<ApiEnvelope<PlatformUserDetail>>(`/platform-admin/users/${id}`)
    ).data;
  },

  async systemStatus() {
    return (
      await apiFetch<ApiEnvelope<PlatformSystemStatus>>("/platform-admin/system")
    ).data;
  },
};
