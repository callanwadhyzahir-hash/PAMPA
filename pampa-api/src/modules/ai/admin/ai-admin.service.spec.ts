import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { PrismaService } from '../../../database/prisma.service';
import type { SecurityAuditService } from '../../auth/audit/security-audit.service';
import type { SecurityContext } from '../../auth/types/security-context';
import type { AiSubscriptionRepository } from '../subscription/ai-subscription.repository';
import type { AiUsageRepository } from '../usage/ai-usage.repository';
import { AiAdminService } from './ai-admin.service';

const context: SecurityContext = {
  userId: 'admin-1',
  companyId: 'platform',
  branchId: null,
  sessionId: 'session-1',
  tokenVersion: 0,
  email: 'admin@pampa.com',
  roles: [],
  permissions: [],
  isPlatformAdmin: true,
};

function makeCompany(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: 'company-a',
    name: 'ACME',
    company_ai_subscription: {
      company_id: 'company-a',
      enabled: false,
      plan_code: 'AI_FREE',
      monthly_credit_limit: 2000,
      internal_cost_limit_usd: new Prisma.Decimal('5.00'),
      credits_used_period: new Prisma.Decimal('0'),
      reserved_credits_period: new Prisma.Decimal('0'),
      cost_used_period_usd: new Prisma.Decimal('0'),
      reserved_cost_period_usd: new Prisma.Decimal('0'),
      period_start: now,
      period_end: now,
      created_at: now,
      updated_at: now,
    },
    ...overrides,
  };
}

function makeService(
  company: ReturnType<typeof makeCompany> | null,
  prismaOverrides: {
    security_event?: { count: jest.Mock };
    $queryRaw?: jest.Mock;
  } = {},
) {
  const subscriptions = {
    getCompanyDetail: jest.fn().mockResolvedValue(company),
    upsertSettings: jest.fn().mockResolvedValue(undefined),
    list: jest.fn(),
    countEnabled: jest.fn().mockResolvedValue(0),
    countBlockedByQuota: jest.fn().mockResolvedValue(0),
  };

  const usageAggregateDefault = {
    _count: { _all: 0 },
    _sum: {
      input_tokens: 0,
      cached_input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: null,
      credits_used: null,
    },
  };
  const usage = {
    aggregateForCompany: jest.fn().mockResolvedValue(usageAggregateDefault),
    aggregateGlobal: jest.fn().mockResolvedValue(usageAggregateDefault),
    listRecentForCompany: jest.fn().mockResolvedValue([]),
  };

  const audit = {
    record: jest
      .fn<Promise<void>, [Parameters<SecurityAuditService['record']>[0]]>()
      .mockResolvedValue(undefined),
  };

  const prisma = {
    security_event: {
      count: jest.fn().mockResolvedValue(0),
      ...prismaOverrides.security_event,
    },
    $queryRaw: prismaOverrides.$queryRaw ?? jest.fn().mockResolvedValue([]),
  };

  const service = new AiAdminService(
    prisma as unknown as PrismaService,
    subscriptions as unknown as AiSubscriptionRepository,
    usage as unknown as AiUsageRepository,
    audit as unknown as SecurityAuditService,
  );
  return { service, subscriptions, usage, audit, prisma };
}

describe('AiAdminService', () => {
  it('getCompany (Platform Admin view) DOES expose internalCostLimitUsd', async () => {
    const { service } = makeService(makeCompany());

    const detail = await service.getCompany('company-a');

    expect(detail.internalCostLimitUsd).toBe(5);
  });

  it('getCompany throws NotFoundException for an unknown company', async () => {
    const { service } = makeService(null);

    await expect(service.getCompany('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updateSettings audits AI_SETTINGS_CHANGED but never includes internal_cost_limit_usd in the metadata', async () => {
    const { service, audit } = makeService(makeCompany());

    await service.updateSettings(context, 'company-a', {
      enabled: true,
      internalCostLimitUsd: '999.99',
    });

    const call = audit.record.mock.calls[0][0];
    expect(call.eventType).toBe('AI_SETTINGS_CHANGED');
    expect(JSON.stringify(call.metadata)).not.toContain('999.99');
    expect(call.metadata).not.toHaveProperty('internalCostLimitUsd');
  });

  it('updateSettings applies the plan preset limits when switching to a non-CUSTOM plan without explicit overrides', async () => {
    const { service, subscriptions } = makeService(makeCompany());

    await service.updateSettings(context, 'company-a', { planCode: 'AI_PRO' });

    expect(subscriptions.upsertSettings).toHaveBeenCalledWith(
      'company-a',
      expect.objectContaining({
        planCode: 'AI_PRO',
        monthlyCreditLimit: 10000,
      }),
    );
  });

  it('updateSettings honors an explicit monthlyCreditLimit even for a preset plan', async () => {
    const { service, subscriptions } = makeService(makeCompany());

    await service.updateSettings(context, 'company-a', {
      planCode: 'AI_PRO',
      monthlyCreditLimit: 42,
    });

    expect(subscriptions.upsertSettings).toHaveBeenCalledWith(
      'company-a',
      expect.objectContaining({ monthlyCreditLimit: 42 }),
    );
  });

  it('overview() reports tool-calling economics (averages, tool usage, provider/rate-limit/quota incident counts)', async () => {
    const count = jest
      .fn()
      .mockResolvedValueOnce(25) // AI_TOOL_CALLED
      .mockResolvedValueOnce(2) // AI_PROVIDER_ERROR
      .mockResolvedValueOnce(3) // AI_RATE_LIMITED
      .mockResolvedValueOnce(1); // AI_QUOTA_EXCEEDED + AI_COST_LIMIT_EXCEEDED
    const queryRaw = jest
      .fn()
      .mockResolvedValue([{ tool: 'search_products', count: BigInt(10) }]);
    const { service } = makeService(null, {
      security_event: { count },
      $queryRaw: queryRaw,
    });

    const overview = await service.overview();

    expect(overview.toolCalls).toBe(25);
    expect(overview.providerErrors).toBe(2);
    expect(overview.rateLimitedRequests).toBe(3);
    expect(overview.quotaBlockedRequests).toBe(1);
    expect(overview.topTools).toEqual([{ tool: 'search_products', count: 10 }]);
  });
});
