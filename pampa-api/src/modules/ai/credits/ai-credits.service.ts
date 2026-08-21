import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AiConfigService } from '../ai.config';

/**
 * Converts real USD cost into PAMPA IA credits — the only unit ever shown
 * to a tenant (raw tokens/cost stay Platform Admin-only). Deliberately
 * cost-based, not token-based: if OpenAI's per-token price changes, or a
 * future provider has a different token economy entirely, credit values
 * stay meaningful without any ledger migration.
 *
 * The conversion rate (AI_CREDIT_VALUE_USD, default 1 credit = $0.001) is
 * the single lever for changing PAMPA IA's credit economy — see
 * docs/pampa-ai-architecture.md §Créditos.
 */
@Injectable()
export class AiCreditsService {
  constructor(private readonly config: AiConfigService) {}

  toCredits(costUsd: Prisma.Decimal): Prisma.Decimal {
    return costUsd.div(this.config.creditValueUsd);
  }
}
