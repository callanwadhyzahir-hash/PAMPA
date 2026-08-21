import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { addOneMonthUtc } from '../common/ai-period.util';

export interface UpsertAiSettingsInput {
  enabled: boolean;
  planCode: string;
  monthlyCreditLimit: number;
  internalCostLimitUsd: Prisma.Decimal;
}

@Injectable()
export class AiSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCompany(companyId: string) {
    return this.prisma.company_ai_subscription.findUnique({
      where: { company_id: companyId },
    });
  }

  /** Creates the subscription row on first configuration, otherwise updates settings only — never touches the usage counters (those are owned by AiQuotaService). */
  async upsertSettings(companyId: string, input: UpsertAiSettingsInput) {
    const now = new Date();
    return this.prisma.company_ai_subscription.upsert({
      where: { company_id: companyId },
      create: {
        company_id: companyId,
        enabled: input.enabled,
        plan_code: input.planCode,
        monthly_credit_limit: input.monthlyCreditLimit,
        internal_cost_limit_usd: input.internalCostLimitUsd,
        period_start: now,
        period_end: addOneMonthUtc(now),
      },
      update: {
        enabled: input.enabled,
        plan_code: input.planCode,
        monthly_credit_limit: input.monthlyCreditLimit,
        internal_cost_limit_usd: input.internalCostLimitUsd,
      },
    });
  }

  async list(params: {
    search?: string;
    enabled?: boolean;
    page: number;
    limit: number;
  }) {
    const where: Prisma.companyWhereInput = {};
    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }
    if (params.enabled === true) {
      where.company_ai_subscription = { is: { enabled: true } };
    } else if (params.enabled === false) {
      where.OR = [
        { company_ai_subscription: { is: null } },
        { company_ai_subscription: { is: { enabled: false } } },
      ];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        include: { company_ai_subscription: true },
        orderBy: { name: 'asc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.company.count({ where }),
    ]);

    return { rows, total };
  }

  async getCompanyDetail(companyId: string) {
    return this.prisma.company.findUnique({
      where: { id: companyId },
      include: { company_ai_subscription: true },
    });
  }

  /** Companies whose current-period usage has reached their commercial limit. Two-column comparison isn't expressible through the fluent Prisma filter API, hence the raw read-only query. */
  async countBlockedByQuota(): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM company_ai_subscription
      WHERE enabled = true AND credits_used_period >= monthly_credit_limit
    `;
    return Number(rows[0]?.count ?? 0);
  }

  countEnabled(): Promise<number> {
    return this.prisma.company_ai_subscription.count({
      where: { enabled: true },
    });
  }
}
