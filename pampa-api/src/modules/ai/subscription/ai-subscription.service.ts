import { Injectable } from '@nestjs/common';

import { AiDisabledError } from '../ai.errors';
import { AiSubscriptionRepository } from './ai-subscription.repository';

export interface AiUsageStatus {
  enabled: boolean;
  plan: string | null;
  creditsUsed: number;
  creditsLimit: number;
  percentageUsed: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  remaining: number;
}

/**
 * Tenant-facing view over company_ai_subscription. Never exposes
 * internal_cost_limit_usd, reserved_* counters, or real USD cost — those
 * belong to Platform Admin only (see AiAdminService).
 */
@Injectable()
export class AiSubscriptionService {
  constructor(private readonly repository: AiSubscriptionRepository) {}

  /** Throws AI_DISABLED when the company has no subscription row yet, or has one that isn't enabled. Called by AiGatewayService before any provider call. */
  async requireEnabled(companyId: string) {
    const subscription = await this.repository.findByCompany(companyId);
    if (!subscription || !subscription.enabled) {
      throw new AiDisabledError();
    }
    return subscription;
  }

  async getUsageStatus(companyId: string): Promise<AiUsageStatus> {
    const subscription = await this.repository.findByCompany(companyId);
    if (!subscription) {
      return {
        enabled: false,
        plan: null,
        creditsUsed: 0,
        creditsLimit: 0,
        percentageUsed: 0,
        periodStart: null,
        periodEnd: null,
        remaining: 0,
      };
    }

    const used = Math.round(subscription.credits_used_period.toNumber());
    const limit = subscription.monthly_credit_limit;
    const percentageUsed =
      limit > 0 ? Math.min(100, Math.round((used / limit) * 1000) / 10) : 100;

    return {
      enabled: subscription.enabled,
      plan: subscription.plan_code,
      creditsUsed: used,
      creditsLimit: limit,
      percentageUsed,
      periodStart: subscription.period_start,
      periodEnd: subscription.period_end,
      remaining: Math.max(0, limit - used),
    };
  }
}
