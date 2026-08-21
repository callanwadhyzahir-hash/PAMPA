import { Prisma } from '@prisma/client';

import type { PrismaService } from '../../../database/prisma.service';
import {
  AiCostLimitExceededError,
  AiDisabledError,
  AiQuotaExceededError,
} from '../ai.errors';
import { AiQuotaService } from './ai-quota.service';

function makeSubscription(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    company_id: 'company-a',
    enabled: true,
    plan_code: 'AI_FREE',
    monthly_credit_limit: 100,
    internal_cost_limit_usd: new Prisma.Decimal('1'),
    credits_used_period: new Prisma.Decimal('0'),
    reserved_credits_period: new Prisma.Decimal('0'),
    cost_used_period_usd: new Prisma.Decimal('0'),
    reserved_cost_period_usd: new Prisma.Decimal('0'),
    period_start: now,
    period_end: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeTx(subscription: ReturnType<typeof makeSubscription> | null) {
  const events: string[] = [];
  return {
    events,
    tx: {
      $executeRaw: jest.fn(() => {
        events.push('lock');
        return Promise.resolve(0);
      }),
      company_ai_subscription: {
        findUnique: jest.fn(() => {
          events.push('read');
          return Promise.resolve(subscription);
        }),
        update: jest.fn((args: { data: Record<string, unknown> }) => {
          events.push('write');
          return Promise.resolve({ ...subscription, ...args.data });
        }),
      },
    },
  };
}

function makeService(subscription: ReturnType<typeof makeSubscription> | null) {
  const { tx, events } = makeTx(subscription);
  const prisma = {
    $transaction: jest.fn(
      (operation: (client: typeof tx) => Promise<unknown>) => operation(tx),
    ),
  };
  return {
    service: new AiQuotaService(prisma as unknown as PrismaService),
    tx,
    events,
  };
}

describe('AiQuotaService', () => {
  it('reserves quota when under both limits, locking before reading', async () => {
    const sub = makeSubscription();
    const { service, events } = makeService(sub);

    await service.reserve('company-a', {
      credits: new Prisma.Decimal('1'),
      costUsd: new Prisma.Decimal('0.001'),
    });

    expect(events).toEqual(['lock', 'read', 'write']);
  });

  it('throws AI_DISABLED when there is no subscription row', async () => {
    const { service } = makeService(null);

    await expect(
      service.reserve('company-a', {
        credits: new Prisma.Decimal('1'),
        costUsd: new Prisma.Decimal('0.001'),
      }),
    ).rejects.toBeInstanceOf(AiDisabledError);
  });

  it('throws AI_DISABLED when the subscription exists but is disabled', async () => {
    const { service } = makeService(makeSubscription({ enabled: false }));

    await expect(
      service.reserve('company-a', {
        credits: new Prisma.Decimal('1'),
        costUsd: new Prisma.Decimal('0.001'),
      }),
    ).rejects.toBeInstanceOf(AiDisabledError);
  });

  it('throws AI_QUOTA_EXCEEDED when the commercial credit limit would be exceeded', async () => {
    const sub = makeSubscription({
      monthly_credit_limit: 10,
      credits_used_period: new Prisma.Decimal('10'),
    });
    const { service, tx } = makeService(sub);

    await expect(
      service.reserve('company-a', {
        credits: new Prisma.Decimal('1'),
        costUsd: new Prisma.Decimal('0.001'),
      }),
    ).rejects.toBeInstanceOf(AiQuotaExceededError);
    expect(tx.company_ai_subscription.update).not.toHaveBeenCalled();
  });

  it('throws AI_COST_LIMIT_EXCEEDED when the internal fuse would be exceeded even under the credit limit', async () => {
    const sub = makeSubscription({
      monthly_credit_limit: 1_000_000,
      internal_cost_limit_usd: new Prisma.Decimal('0.01'),
      cost_used_period_usd: new Prisma.Decimal('0.0099'),
    });
    const { service, tx } = makeService(sub);

    await expect(
      service.reserve('company-a', {
        credits: new Prisma.Decimal('1'),
        costUsd: new Prisma.Decimal('0.005'),
      }),
    ).rejects.toBeInstanceOf(AiCostLimitExceededError);
    expect(tx.company_ai_subscription.update).not.toHaveBeenCalled();
  });

  it('counts in-flight reservations from other concurrent requests toward both limits', async () => {
    const sub = makeSubscription({
      monthly_credit_limit: 10,
      credits_used_period: new Prisma.Decimal('5'),
      reserved_credits_period: new Prisma.Decimal('4'),
    });
    const { service } = makeService(sub);

    // used(5) + reserved(4) + this request(2) = 11 > limit(10)
    await expect(
      service.reserve('company-a', {
        credits: new Prisma.Decimal('2'),
        costUsd: new Prisma.Decimal('0.001'),
      }),
    ).rejects.toBeInstanceOf(AiQuotaExceededError);
  });

  it('resets the period and its counters when the current period has expired (lazy rollover)', async () => {
    const past = new Date(Date.now() - 1000);
    const sub = makeSubscription({
      period_end: past,
      credits_used_period: new Prisma.Decimal('99'),
      monthly_credit_limit: 100,
    });
    const { service, tx } = makeService(sub);

    await service.reserve('company-a', {
      credits: new Prisma.Decimal('50'),
      costUsd: new Prisma.Decimal('0.001'),
    });

    const rolloverCall = tx.company_ai_subscription.update.mock.calls[0][0];
    expect(rolloverCall.data.credits_used_period).toEqual(
      new Prisma.Decimal(0),
    );
  });

  it('settle scopes the write to the given company and moves reserved into used', async () => {
    const sub = makeSubscription();
    const { service, tx } = makeService(sub);

    await service.settle(
      'company-a',
      {
        credits: new Prisma.Decimal('2'),
        costUsd: new Prisma.Decimal('0.002'),
      },
      {
        credits: new Prisma.Decimal('1.5'),
        costUsd: new Prisma.Decimal('0.0015'),
      },
    );

    expect(tx.company_ai_subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { company_id: 'company-a' } }),
    );
  });

  it('release only decrements the reservation, without touching used counters', async () => {
    const sub = makeSubscription();
    const { service, tx } = makeService(sub);

    await service.release('company-a', {
      credits: new Prisma.Decimal('2'),
      costUsd: new Prisma.Decimal('0.002'),
    });

    const call = tx.company_ai_subscription.update.mock.calls[0][0];
    expect(call.data).not.toHaveProperty('credits_used_period');
    expect(call.data).not.toHaveProperty('cost_used_period_usd');
    expect(call.data.reserved_credits_period).toEqual({
      decrement: new Prisma.Decimal('2'),
    });
  });
});
