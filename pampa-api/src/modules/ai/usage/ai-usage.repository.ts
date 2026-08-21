import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

export interface RecordUsageInput {
  companyId: string;
  userId?: string;
  provider: string;
  model: string;
  operation: string;
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: Prisma.Decimal;
  creditsUsed?: Prisma.Decimal;
  status: 'SUCCESS' | 'ERROR';
  errorCode?: string;
}

/**
 * Writes to the AI Usage Ledger only — token counts and cost, never prompt
 * or response content (see docs/pampa-ai-architecture.md §Privacidad: AI
 * Usage Ledger vs AI Conversation History). RecordUsageInput has no field
 * for message text; there is nowhere to put it even by mistake.
 */
@Injectable()
export class AiUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  record(input: RecordUsageInput) {
    return this.prisma.ai_usage_ledger.create({
      data: {
        company_id: input.companyId,
        user_id: input.userId,
        provider: input.provider,
        model: input.model,
        operation: input.operation,
        input_tokens: input.inputTokens ?? 0,
        cached_input_tokens: input.cachedInputTokens ?? 0,
        output_tokens: input.outputTokens ?? 0,
        total_tokens: input.totalTokens ?? 0,
        estimated_cost_usd: input.estimatedCostUsd ?? new Prisma.Decimal(0),
        credits_used: input.creditsUsed ?? new Prisma.Decimal(0),
        status: input.status,
        error_code: input.errorCode,
      },
    });
  }

  aggregateForCompany(companyId: string, since: Date) {
    return this.prisma.ai_usage_ledger.aggregate({
      where: { company_id: companyId, created_at: { gte: since } },
      _count: { _all: true },
      _sum: {
        input_tokens: true,
        cached_input_tokens: true,
        output_tokens: true,
        total_tokens: true,
        estimated_cost_usd: true,
        credits_used: true,
      },
    });
  }

  aggregateGlobal(since: Date) {
    return this.prisma.ai_usage_ledger.aggregate({
      where: { created_at: { gte: since } },
      _count: { _all: true },
      _sum: {
        input_tokens: true,
        output_tokens: true,
        total_tokens: true,
        estimated_cost_usd: true,
        credits_used: true,
      },
    });
  }

  listRecentForCompany(companyId: string, limit: number) {
    return this.prisma.ai_usage_ledger.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        id: true,
        provider: true,
        model: true,
        operation: true,
        input_tokens: true,
        cached_input_tokens: true,
        output_tokens: true,
        total_tokens: true,
        estimated_cost_usd: true,
        credits_used: true,
        status: true,
        error_code: true,
        created_at: true,
      },
    });
  }
}
