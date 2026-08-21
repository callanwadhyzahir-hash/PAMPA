import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { addOneMonthUtc } from '../common/ai-period.util';
import {
  AiCostLimitExceededError,
  AiDisabledError,
  AiQuotaExceededError,
} from '../ai.errors';

export interface AiQuotaEstimate {
  credits: Prisma.Decimal;
  costUsd: Prisma.Decimal;
}

export interface AiQuotaActual {
  credits: Prisma.Decimal;
  costUsd: Prisma.Decimal;
}

/**
 * Enforces the double economic protection (commercial credit limit + internal
 * cost fuse) under concurrency, using Postgres row locking — the same
 * pattern RateLimitService already uses for login throttling, no Redis.
 *
 * Concurrency strategy (see docs/pampa-ai-architecture.md §Concurrencia for
 * the full writeup): a request that wants to call the provider must first
 * reserve() an estimated worst-case cost, which takes a transaction-scoped
 * `pg_advisory_xact_lock` on the company row, checks
 * `used + reserved + estimate` against both limits, and — if under —
 * increments the `reserved_*` counters and commits (releasing the lock
 * immediately; the provider call itself never happens while holding it).
 * After the provider responds, settle() re-acquires the lock, moves the
 * reservation into the real, now-known usage. release() undoes a reservation
 * if the provider call failed before producing usage. Because every
 * concurrent request for the same company serializes on the advisory lock
 * during reserve()/settle()/release(), N simultaneous requests can never
 * push the *reserved* total past the limit by more than one request's
 * worst-case estimate — bounding the overshoot instead of eliminating the
 * pre-call/post-call gap that's inherent to token-metered billing (nobody
 * knows the real cost until the provider responds).
 */
@Injectable()
export class AiQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  async reserve(companyId: string, estimate: AiQuotaEstimate): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ai_quota'), hashtext(${companyId}))`;

      let subscription = await tx.company_ai_subscription.findUnique({
        where: { company_id: companyId },
      });
      if (!subscription || !subscription.enabled) {
        throw new AiDisabledError();
      }

      const now = new Date();
      if (now >= subscription.period_end) {
        subscription = await tx.company_ai_subscription.update({
          where: { company_id: companyId },
          data: {
            period_start: now,
            period_end: addOneMonthUtc(now),
            credits_used_period: new Prisma.Decimal(0),
            reserved_credits_period: new Prisma.Decimal(0),
            cost_used_period_usd: new Prisma.Decimal(0),
            reserved_cost_period_usd: new Prisma.Decimal(0),
          },
        });
      }

      const projectedCredits = subscription.credits_used_period
        .add(subscription.reserved_credits_period)
        .add(estimate.credits);
      if (projectedCredits.greaterThan(subscription.monthly_credit_limit)) {
        throw new AiQuotaExceededError();
      }

      const projectedCostUsd = subscription.cost_used_period_usd
        .add(subscription.reserved_cost_period_usd)
        .add(estimate.costUsd);
      if (projectedCostUsd.greaterThan(subscription.internal_cost_limit_usd)) {
        throw new AiCostLimitExceededError();
      }

      await tx.company_ai_subscription.update({
        where: { company_id: companyId },
        data: {
          reserved_credits_period: { increment: estimate.credits },
          reserved_cost_period_usd: { increment: estimate.costUsd },
        },
      });
    });
  }

  /** Moves a reservation into settled usage once the provider call succeeded and real usage is known. */
  async settle(
    companyId: string,
    estimate: AiQuotaEstimate,
    actual: AiQuotaActual,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ai_quota'), hashtext(${companyId}))`;
      await tx.company_ai_subscription.update({
        where: { company_id: companyId },
        data: {
          reserved_credits_period: { decrement: estimate.credits },
          reserved_cost_period_usd: { decrement: estimate.costUsd },
          credits_used_period: { increment: actual.credits },
          cost_used_period_usd: { increment: actual.costUsd },
        },
      });
    });
  }

  /** Releases a reservation without recording any usage — the provider call failed before it could produce a bill. */
  async release(companyId: string, estimate: AiQuotaEstimate): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ai_quota'), hashtext(${companyId}))`;
      await tx.company_ai_subscription.update({
        where: { company_id: companyId },
        data: {
          reserved_credits_period: { decrement: estimate.credits },
          reserved_cost_period_usd: { decrement: estimate.costUsd },
        },
      });
    });
  }
}
