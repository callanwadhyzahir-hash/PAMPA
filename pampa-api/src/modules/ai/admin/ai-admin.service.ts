import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { SecurityAuditService } from '../../auth/audit/security-audit.service';
import type { SecurityContext } from '../../auth/types/security-context';
import { AI_PLAN_PRESETS, type AiPlanCode } from '../common/ai-plans';
import { AiSubscriptionRepository } from '../subscription/ai-subscription.repository';
import { AiUsageRepository } from '../usage/ai-usage.repository';
import type { AiCompanyQueryDto } from './dto/ai-company-query.dto';
import type { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';

type CompanyAiSubscription = Awaited<
  ReturnType<AiSubscriptionRepository['findByCompany']>
>;
type CompanyAiUsageAggregate = Awaited<
  ReturnType<AiUsageRepository['aggregateForCompany']>
>;

const OVERVIEW_WINDOW_DAYS = 30;

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return value ? value.toNumber() : 0;
}

function percentageUsed(usedCredits: number, limit: number): number {
  if (limit <= 0) return usedCredits > 0 ? 100 : 0;
  return Math.min(100, Math.round((usedCredits / limit) * 1000) / 10);
}

/**
 * Platform Admin's view of PAMPA IA — the only place real token counts and
 * real USD cost are ever surfaced (never to a tenant, see
 * AiSubscriptionService). Every mutating call here is audited as
 * AI_SETTINGS_CHANGED, but the audit metadata never includes
 * internal_cost_limit_usd even though this service reads/writes it.
 */
@Injectable()
export class AiAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: AiSubscriptionRepository,
    private readonly usage: AiUsageRepository,
    private readonly audit: SecurityAuditService,
  ) {}

  async overview() {
    const since = new Date(
      Date.now() - OVERVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    const [
      companiesWithAiEnabled,
      companiesBlockedByQuota,
      usageAgg,
      toolCalls,
      providerErrors,
      rateLimitedRequests,
      quotaBlockedRequests,
      topToolsRaw,
    ] = await Promise.all([
      this.subscriptions.countEnabled(),
      this.subscriptions.countBlockedByQuota(),
      this.usage.aggregateGlobal(since),
      this.prisma.security_event.count({
        where: { event_type: 'AI_TOOL_CALLED', created_at: { gte: since } },
      }),
      this.prisma.security_event.count({
        where: { event_type: 'AI_PROVIDER_ERROR', created_at: { gte: since } },
      }),
      this.prisma.security_event.count({
        where: { event_type: 'AI_RATE_LIMITED', created_at: { gte: since } },
      }),
      this.prisma.security_event.count({
        where: {
          event_type: { in: ['AI_QUOTA_EXCEEDED', 'AI_COST_LIMIT_EXCEEDED'] },
          created_at: { gte: since },
        },
      }),
      // metadata is JSON — grouping by a JSON key isn't expressible through
      // the fluent Prisma API, hence the raw read-only aggregate. Only ever
      // reads the `tool` name AiGatewayService.executeToolCall() itself
      // writes into the audit metadata — never prompt/tool-result content.
      this.prisma.$queryRaw<Array<{ tool: string | null; count: bigint }>>`
        SELECT metadata->>'tool' AS tool, COUNT(*)::bigint AS count
        FROM security_event
        WHERE event_type = 'AI_TOOL_CALLED' AND created_at >= ${since}
        GROUP BY metadata->>'tool'
        ORDER BY count DESC
        LIMIT 10
      `,
    ]);

    const requests = usageAgg._count._all;
    const totalTokens = usageAgg._sum.total_tokens ?? 0;
    const estimatedCostUsd = decimalToNumber(usageAgg._sum.estimated_cost_usd);

    return {
      periodDays: OVERVIEW_WINDOW_DAYS,
      companiesWithAiEnabled,
      companiesBlockedByQuota,
      requests,
      inputTokens: usageAgg._sum.input_tokens ?? 0,
      outputTokens: usageAgg._sum.output_tokens ?? 0,
      totalTokens,
      estimatedCostUsd,
      creditsConsumed: Math.round(decimalToNumber(usageAgg._sum.credits_used)),
      averageTokensPerRequest:
        requests > 0 ? Math.round(totalTokens / requests) : 0,
      averageCostPerRequestUsd: requests > 0 ? estimatedCostUsd / requests : 0,
      toolCalls,
      topTools: topToolsRaw
        .filter(
          (row): row is { tool: string; count: bigint } => row.tool !== null,
        )
        .map((row) => ({ tool: row.tool, count: Number(row.count) })),
      providerErrors,
      rateLimitedRequests,
      quotaBlockedRequests,
    };
  }

  async listCompanies(query: AiCompanyQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { rows, total } = await this.subscriptions.list({
      search: query.search,
      enabled:
        query.enabled === undefined ? undefined : query.enabled === 'true',
      page,
      limit,
    });

    const items = await Promise.all(
      rows.map(async (row) => {
        const sub = row.company_ai_subscription;
        const usageAgg = sub
          ? await this.usage.aggregateForCompany(row.id, sub.period_start)
          : null;
        return this.toCompanySummary(row.id, row.name, sub, usageAgg);
      }),
    );

    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getCompany(companyId: string) {
    const company = await this.subscriptions.getCompanyDetail(companyId);
    if (!company) throw new NotFoundException('Empresa no encontrada.');

    const sub = company.company_ai_subscription;
    const [usageAgg, recent] = await Promise.all([
      sub ? this.usage.aggregateForCompany(companyId, sub.period_start) : null,
      this.usage.listRecentForCompany(companyId, 20),
    ]);

    return {
      ...this.toCompanySummary(company.id, company.name, sub, usageAgg),
      internalCostLimitUsd: sub
        ? decimalToNumber(sub.internal_cost_limit_usd)
        : null,
      costUsedPeriodUsd: sub ? decimalToNumber(sub.cost_used_period_usd) : 0,
      recentUsage: recent.map((entry) => ({
        id: entry.id,
        provider: entry.provider,
        model: entry.model,
        operation: entry.operation,
        inputTokens: entry.input_tokens,
        cachedInputTokens: entry.cached_input_tokens,
        outputTokens: entry.output_tokens,
        totalTokens: entry.total_tokens,
        estimatedCostUsd: decimalToNumber(entry.estimated_cost_usd),
        creditsUsed: decimalToNumber(entry.credits_used),
        status: entry.status,
        errorCode: entry.error_code,
        createdAt: entry.created_at,
      })),
    };
  }

  async updateSettings(
    context: SecurityContext,
    companyId: string,
    dto: UpdateAiSettingsDto,
  ) {
    const company = await this.subscriptions.getCompanyDetail(companyId);
    if (!company) throw new NotFoundException('Empresa no encontrada.');

    const existing = company.company_ai_subscription;
    const planCode: AiPlanCode = (dto.planCode ??
      existing?.plan_code ??
      'AI_FREE') as AiPlanCode;
    const preset = AI_PLAN_PRESETS[planCode];
    const planChanged =
      dto.planCode !== undefined && dto.planCode !== existing?.plan_code;

    const monthlyCreditLimit =
      dto.monthlyCreditLimit ??
      (planChanged && planCode !== 'CUSTOM'
        ? preset.monthlyCreditLimit
        : existing?.monthly_credit_limit) ??
      preset.monthlyCreditLimit;

    const internalCostLimitUsd =
      dto.internalCostLimitUsd !== undefined
        ? new Prisma.Decimal(dto.internalCostLimitUsd)
        : ((planChanged && planCode !== 'CUSTOM'
            ? new Prisma.Decimal(preset.internalCostLimitUsd)
            : existing?.internal_cost_limit_usd) ??
          new Prisma.Decimal(preset.internalCostLimitUsd));

    const enabled = dto.enabled ?? existing?.enabled ?? false;

    await this.subscriptions.upsertSettings(companyId, {
      enabled,
      planCode,
      monthlyCreditLimit,
      internalCostLimitUsd,
    });

    // internal_cost_limit_usd is deliberately excluded from audit metadata —
    // it must never leak outside Platform Admin's own database queries.
    await this.audit.record({
      companyId,
      actorUserId: context.userId,
      eventType: 'AI_SETTINGS_CHANGED',
      result: 'SUCCESS',
      metadata: { enabled, planCode, monthlyCreditLimit, reason: dto.reason },
    });

    return this.getCompany(companyId);
  }

  private toCompanySummary(
    companyId: string,
    companyName: string,
    sub: CompanyAiSubscription | null | undefined,
    usageAgg: CompanyAiUsageAggregate | null,
  ) {
    const creditsUsed = sub
      ? Math.round(sub.credits_used_period.toNumber())
      : 0;
    const creditsLimit = sub?.monthly_credit_limit ?? 0;

    return {
      companyId,
      companyName,
      enabled: sub?.enabled ?? false,
      plan: sub?.plan_code ?? null,
      creditsUsed,
      creditsLimit,
      percentageUsed: sub ? percentageUsed(creditsUsed, creditsLimit) : 0,
      periodStart: sub?.period_start ?? null,
      periodEnd: sub?.period_end ?? null,
      requests: usageAgg?._count._all ?? 0,
      inputTokens: usageAgg?._sum.input_tokens ?? 0,
      outputTokens: usageAgg?._sum.output_tokens ?? 0,
      totalTokens: usageAgg?._sum.total_tokens ?? 0,
      estimatedCostUsd: decimalToNumber(usageAgg?._sum.estimated_cost_usd),
    };
  }
}
