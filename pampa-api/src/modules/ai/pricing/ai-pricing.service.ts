import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AI_PRICING_TABLE } from './ai-pricing.config';

export interface AiCostInput {
  provider: string;
  model: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  at?: Date;
}

/**
 * Central money math for PAMPA IA. No service outside this class may
 * hardcode a $/token figure — see docs/pampa-ai-architecture.md §Pricing.
 * All arithmetic uses Prisma.Decimal (never JS floats) so the resulting
 * estimated_cost_usd is exact enough to persist in a financial ledger.
 */
@Injectable()
export class AiPricingService {
  /** Real cost of a completed request, from actual token counts. */
  calculate(input: AiCostInput): Prisma.Decimal {
    const entry = this.findEntry(
      input.provider,
      input.model,
      input.at ?? new Date(),
    );
    const billableInput = Math.max(
      0,
      input.inputTokens - input.cachedInputTokens,
    );

    const inputCost = new Prisma.Decimal(billableInput)
      .mul(entry.inputPerMillion)
      .div(1_000_000);
    const cachedCost = new Prisma.Decimal(input.cachedInputTokens)
      .mul(entry.cachedInputPerMillion)
      .div(1_000_000);
    const outputCost = new Prisma.Decimal(input.outputTokens)
      .mul(entry.outputPerMillion)
      .div(1_000_000);

    return inputCost.add(cachedCost).add(outputCost);
  }

  /**
   * Conservative upper-bound cost for a request that hasn't been sent yet —
   * used by AiQuotaService.reserve() to hold quota before calling the
   * provider, since the real cost is only known after the response comes
   * back with real usage. Assumes zero cache hits (worst case) and the
   * request's full output-token cap.
   */
  estimateMax(input: {
    provider: string;
    model: string;
    estimatedInputTokens: number;
    maxOutputTokens: number;
    at?: Date;
  }): Prisma.Decimal {
    return this.calculate({
      provider: input.provider,
      model: input.model,
      inputTokens: input.estimatedInputTokens,
      cachedInputTokens: 0,
      outputTokens: input.maxOutputTokens,
      at: input.at,
    });
  }

  private findEntry(provider: string, model: string, at: Date) {
    const atTime = at.getTime();
    const candidates = AI_PRICING_TABLE.filter(
      (entry) =>
        entry.provider === provider &&
        entry.model === model &&
        new Date(entry.effectiveFrom).getTime() <= atTime,
    );
    if (candidates.length === 0) {
      throw new Error(
        `No AI pricing entry configured for ${provider}/${model}. Add one to ai-pricing.config.ts.`,
      );
    }
    return candidates.reduce((latest, entry) =>
      entry.effectiveFrom > latest.effectiveFrom ? entry : latest,
    );
  }
}
