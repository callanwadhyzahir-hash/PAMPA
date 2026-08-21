import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

/**
 * Single source of truth for AI model names. Nothing outside this file may
 * write a model string literal — AiPricingService, OpenAiProvider and every
 * caller read AiConfigService.generalModel instead.
 */
export const AI_MODELS = {
  GENERAL: 'gpt-5-mini',
} as const;

export const AI_PROVIDER_NAME = 'openai';

/**
 * Reads every PAMPA IA environment variable exactly once at boot. Never
 * throws when OPENAI_API_KEY is missing — `configured: false` is the
 * intended, non-fatal state (see docs/pampa-ai-architecture.md §Seguridad).
 * OPENAI_API_KEY itself is only ever exposed through this class' private
 * field; no getter, log line, or error message anywhere in the ai module
 * may print it.
 */
@Injectable()
export class AiConfigService {
  private readonly apiKey?: string;
  readonly configured: boolean;
  readonly generalModel: string = AI_MODELS.GENERAL;
  readonly providerName: string = AI_PROVIDER_NAME;

  /** USD value of one PAMPA IA credit. Credits = cost_usd / creditValueUsd — see AiCreditsService. */
  readonly creditValueUsd: Prisma.Decimal;
  readonly chatMaxOutputTokens: number;
  readonly rateLimitCompanyPerMinute: number;
  readonly rateLimitUserPerMinute: number;

  /** Max model round-trips per chat() call (a "round" = one provider.complete() call). Bounds both cost and latency of the tool-calling loop. */
  readonly maxToolRounds: number;
  /** Max tool executions across the whole loop, regardless of how many rounds — a model could request several tools in one round. */
  readonly maxToolCallsPerRequest: number;
  /** Per-tool execution timeout. A slow/hanging tool must not hang the whole chat request. */
  readonly toolTimeoutMs: number;
  /** Max prior messages (from the session-only, client-supplied conversation context) sent back to the model — see docs/pampa-ai-architecture.md §Contexto. */
  readonly maxConversationContextMessages: number;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('OPENAI_API_KEY') || undefined;
    this.configured = Boolean(this.apiKey);
    this.creditValueUsd = new Prisma.Decimal(
      config.get<string>('AI_CREDIT_VALUE_USD') || '0.001',
    );
    this.chatMaxOutputTokens = Number(
      config.get<string>('AI_CHAT_MAX_OUTPUT_TOKENS') || 700,
    );
    this.rateLimitCompanyPerMinute = Number(
      config.get<string>('AI_RATE_LIMIT_COMPANY_PER_MINUTE') || 20,
    );
    this.rateLimitUserPerMinute = Number(
      config.get<string>('AI_RATE_LIMIT_USER_PER_MINUTE') || 6,
    );
    this.maxToolRounds = Number(config.get<string>('AI_MAX_TOOL_ROUNDS') || 5);
    this.maxToolCallsPerRequest = Number(
      config.get<string>('AI_MAX_TOOL_CALLS_PER_REQUEST') || 10,
    );
    this.toolTimeoutMs = Number(
      config.get<string>('AI_TOOL_TIMEOUT_MS') || 8000,
    );
    this.maxConversationContextMessages = Number(
      config.get<string>('AI_MAX_CONVERSATION_CONTEXT_MESSAGES') || 10,
    );
  }

  /** Only OpenAiProvider may call this, and only after checking `configured`. */
  requireApiKey(): string {
    if (!this.apiKey) {
      throw new Error(
        'AiConfigService.requireApiKey() called without OPENAI_API_KEY — caller must check `configured` first.',
      );
    }
    return this.apiKey;
  }
}
