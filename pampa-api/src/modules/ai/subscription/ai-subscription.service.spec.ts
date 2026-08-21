import { Prisma } from '@prisma/client';

import { AiDisabledError } from '../ai.errors';
import type { AiSubscriptionRepository } from './ai-subscription.repository';
import { AiSubscriptionService } from './ai-subscription.service';

function makeSubscription(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    company_id: 'company-a',
    enabled: true,
    plan_code: 'AI_PRO',
    monthly_credit_limit: 1000,
    internal_cost_limit_usd: new Prisma.Decimal('999'),
    credits_used_period: new Prisma.Decimal('780'),
    reserved_credits_period: new Prisma.Decimal('0'),
    cost_used_period_usd: new Prisma.Decimal('1.23'),
    reserved_cost_period_usd: new Prisma.Decimal('0'),
    period_start: now,
    period_end: now,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('AiSubscriptionService', () => {
  it('requireEnabled throws AI_DISABLED when there is no subscription row', async () => {
    const repository = { findByCompany: jest.fn().mockResolvedValue(null) };
    const service = new AiSubscriptionService(
      repository as unknown as AiSubscriptionRepository,
    );

    await expect(service.requireEnabled('company-a')).rejects.toBeInstanceOf(
      AiDisabledError,
    );
  });

  it('requireEnabled throws AI_DISABLED when the row exists but enabled is false', async () => {
    const repository = {
      findByCompany: jest
        .fn()
        .mockResolvedValue(makeSubscription({ enabled: false })),
    };
    const service = new AiSubscriptionService(
      repository as unknown as AiSubscriptionRepository,
    );

    await expect(service.requireEnabled('company-a')).rejects.toBeInstanceOf(
      AiDisabledError,
    );
  });

  it('getUsageStatus computes percentage/remaining and never exposes cost fields', async () => {
    const repository = {
      findByCompany: jest.fn().mockResolvedValue(makeSubscription()),
    };
    const service = new AiSubscriptionService(
      repository as unknown as AiSubscriptionRepository,
    );

    const status = await service.getUsageStatus('company-a');

    expect(status).toEqual({
      enabled: true,
      plan: 'AI_PRO',
      creditsUsed: 780,
      creditsLimit: 1000,
      percentageUsed: 78,
      periodStart: expect.any(Date) as Date,
      periodEnd: expect.any(Date) as Date,
      remaining: 220,
    });
    expect(JSON.stringify(status)).not.toContain('internal_cost_limit_usd');
    expect(JSON.stringify(status)).not.toContain('999');
    expect(JSON.stringify(status)).not.toContain('1.23');
  });

  it('getUsageStatus reports disabled/zeroed status for a company with no subscription row', async () => {
    const repository = { findByCompany: jest.fn().mockResolvedValue(null) };
    const service = new AiSubscriptionService(
      repository as unknown as AiSubscriptionRepository,
    );

    const status = await service.getUsageStatus('company-a');

    expect(status.enabled).toBe(false);
    expect(status.creditsLimit).toBe(0);
    expect(status.percentageUsed).toBe(0);
  });
});
