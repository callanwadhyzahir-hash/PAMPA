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

export interface AiTopTool {
  tool: string;
  count: number;
}

export interface AiOverview {
  periodDays: number;
  companiesWithAiEnabled: number;
  companiesBlockedByQuota: number;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  creditsConsumed: number;
  averageTokensPerRequest: number;
  averageCostPerRequestUsd: number;
  toolCalls: number;
  topTools: AiTopTool[];
  providerErrors: number;
  rateLimitedRequests: number;
  quotaBlockedRequests: number;
}

export interface AiCompanySummary {
  companyId: string;
  companyName: string;
  enabled: boolean;
  plan: string | null;
  creditsUsed: number;
  creditsLimit: number;
  percentageUsed: number;
  periodStart: string | null;
  periodEnd: string | null;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface AiUsageLedgerEntry {
  id: string;
  provider: string;
  model: string;
  operation: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  creditsUsed: number;
  status: "SUCCESS" | "ERROR";
  errorCode: string | null;
  createdAt: string;
}

export interface AiCompanyDetail extends AiCompanySummary {
  internalCostLimitUsd: number | null;
  costUsedPeriodUsd: number;
  recentUsage: AiUsageLedgerEntry[];
}

interface CompanyPage {
  items: AiCompanySummary[];
  pagination: Pagination;
}

export interface UpdateAiSettingsInput {
  enabled?: boolean;
  planCode?: "AI_FREE" | "AI_PRO" | "AI_BUSINESS" | "CUSTOM";
  monthlyCreditLimit?: number;
  internalCostLimitUsd?: string;
  reason?: string;
}

export const aiAdminService = {
  async overview() {
    return (await apiFetch<ApiEnvelope<AiOverview>>("/platform-admin/ai/overview")).data;
  },

  async listCompanies(params?: { search?: string; enabled?: boolean; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.enabled !== undefined) query.set("enabled", String(params.enabled));
    query.set("page", String(params?.page ?? 1));
    query.set("limit", String(params?.limit ?? 20));
    return (
      await apiFetch<ApiEnvelope<CompanyPage>>(`/platform-admin/ai/companies?${query.toString()}`)
    ).data;
  },

  async getCompany(id: string) {
    return (
      await apiFetch<ApiEnvelope<AiCompanyDetail>>(`/platform-admin/ai/companies/${id}`)
    ).data;
  },

  async updateSettings(id: string, input: UpdateAiSettingsInput) {
    return (
      await apiFetch<ApiEnvelope<AiCompanyDetail>>(`/platform-admin/ai/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    ).data;
  },
};
