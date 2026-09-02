import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { RateLimitService } from '../../auth/rate-limit/rate-limit.service';
import { SecurityAuditService } from '../../auth/audit/security-audit.service';
import type { SecurityContext } from '../../auth/types/security-context';
import { AiConfigService } from '../ai.config';
import {
  AiCostLimitExceededError,
  AiDomainError,
  AiProviderError,
  AiProviderNotConfiguredError,
  AiRateLimitedError,
} from '../ai.errors';
import { AiCreditsService } from '../credits/ai-credits.service';
import { AiPricingService } from '../pricing/ai-pricing.service';
import { GeminiProvider } from '../provider/gemini-provider.service';
import { OpenAiProvider } from '../provider/openai-provider.service';
import type { AiToolCall } from '../provider/ai-tool.interface';
import type {
  AiMessage,
  AiProvider,
  AiUsage,
} from '../provider/ai-provider.interface';
import {
  AiQuotaService,
  type AiQuotaEstimate,
} from '../quota/ai-quota.service';
import { AiSubscriptionService } from '../subscription/ai-subscription.service';
import { AiToolRegistry } from '../tools/ai-tool-registry';
import { AiUsageRepository } from '../usage/ai-usage.repository';
import { AI_EXTRACTION_SYSTEM_PROMPT } from './ai-extraction-prompt';
import {
  parseExtractionResponse,
  type AiExtractionInput,
  type AiExtractionResult,
} from './ai-extraction.types';
import { AI_SYSTEM_PROMPT } from './ai-system-prompt';

const RATE_LIMIT_WINDOW_MS = 60_000;
/** Rough chars->tokens heuristic (~3 chars/token covers Spanish text safely) used only to size the worst-case reservation before calling the provider — never for billing. */
const CHARS_PER_TOKEN_ESTIMATE = 3;
/** Conservative per-round input-token budget for tool results appended to the transcript, since a request may execute tools across multiple rounds — see estimateWorstCase(). Tool outputs are minimized (see docs/pampa-ai-architecture.md §Contexto) so this comfortably bounds them. */
const TOOL_RESULT_TOKEN_BUDGET_PER_ROUND = 400;
/** Worst-case input-token reservation for one image in an extraction request — both Gemini and OpenAI charge a few hundred to ~1500 tokens per image depending on resolution; this is a deliberately generous upper bound for the pre-call quota hold, never for billing (the real cost comes from the provider's actual usage). */
const EXTRACTION_IMAGE_TOKEN_ESTIMATE = 1500;
/** Argument keys a tool handler must never see, even if the model produced them — security context always comes from the authenticated request, never from model-generated arguments (see docs/pampa-ai-architecture.md §Seguridad). */
const FORBIDDEN_TOOL_ARG_KEYS = [
  'company_id',
  'companyId',
  'user_id',
  'userId',
  'company',
  'tenant',
  'tenantId',
  'tenant_id',
];

export interface AiConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatResult {
  reply: string;
  usage: {
    creditsUsed: number;
    creditsRemaining: number;
    percentageUsed: number;
  };
}

class ToolTimeoutError extends Error {}

function zeroUsage(): AiUsage {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
}

function sanitizeToolArguments(
  args: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized = { ...args };
  for (const key of FORBIDDEN_TOOL_ARG_KEYS) delete sanitized[key];
  return sanitized;
}

/**
 * The single choke point every future PAMPA IA feature must call through —
 * no controller or ERP module may reach AiProvider or AiToolRegistry
 * directly. Implements the flow from docs/pampa-ai-architecture.md:
 * Auth -> RBAC -> AiGatewayService -> quota check -> cost protection ->
 * provider (tool-calling loop) -> usage recording -> response.
 */
@Injectable()
export class AiGatewayService {
  constructor(
    private readonly config: AiConfigService,
    private readonly subscriptions: AiSubscriptionService,
    private readonly quota: AiQuotaService,
    private readonly pricing: AiPricingService,
    private readonly credits: AiCreditsService,
    private readonly usage: AiUsageRepository,
    private readonly rateLimit: RateLimitService,
    private readonly audit: SecurityAuditService,
    private readonly tools: AiToolRegistry,
    /**
     * Every call picks between these two itself, per the company's plan —
     * see selectProviderForPlan(). Neither is a fixed "default"; nothing
     * else in this class holds a single ambient AiProvider.
     */
    private readonly openAiProvider: OpenAiProvider,
    private readonly geminiProvider: GeminiProvider,
  ) {}

  /**
   * Commercial routing, not resilience: AI_FREE companies run on Gemini
   * (free tier), every paying plan runs on OpenAI. Deliberately no
   * cross-plan fallback on failure — a Free company's request never
   * silently spends real OpenAI money, and a Pro company's request never
   * silently downgrades to the free provider. A provider outage fails the
   * request (AiProviderError, "try again shortly"), it does not switch
   * plans.
   */
  private selectProviderForPlan(
    planCode: string | null | undefined,
  ): AiProvider {
    return planCode === 'AI_FREE' ? this.geminiProvider : this.openAiProvider;
  }

  private isProviderConfigured(provider: AiProvider): boolean {
    return provider === this.geminiProvider
      ? this.config.geminiConfigured
      : this.config.configured;
  }

  private modelFor(provider: AiProvider): string {
    return provider === this.geminiProvider
      ? this.config.geminiModel
      : this.config.generalModel;
  }

  async chat(
    context: SecurityContext,
    message: string,
    conversationContext: AiConversationTurn[] = [],
  ): Promise<AiChatResult> {
    const subscription = await this.subscriptions.requireEnabled(
      context.companyId,
    );
    const provider = this.selectProviderForPlan(subscription.plan_code);
    if (!this.isProviderConfigured(provider)) {
      throw new AiProviderNotConfiguredError();
    }

    await this.enforceRateLimit(context);

    const truncatedContext = conversationContext.slice(
      -this.config.maxConversationContextMessages,
    );
    const estimate = this.estimateWorstCase(
      provider,
      message,
      truncatedContext,
    );
    await this.reserveQuota(context, estimate);

    const messages: AiMessage[] = [
      { role: 'system', content: AI_SYSTEM_PROMPT },
      ...truncatedContext.map((turn): AiMessage => ({
        role: turn.role,
        content: turn.content,
      })),
      { role: 'user', content: message },
    ];
    const toolDefinitions = this.tools.toDefinitions();

    const accumulatedUsage = zeroUsage();
    let costAccumulated = new Prisma.Decimal(0);
    let creditsAccumulated = new Prisma.Decimal(0);
    let toolCallsExecuted = 0;
    let finalContent: string | null = null;

    try {
      for (let round = 1; round <= this.config.maxToolRounds; round++) {
        const result = await provider.complete({
          messages,
          tools: toolDefinitions,
          maxOutputTokens: this.config.chatMaxOutputTokens,
        });

        this.addUsage(accumulatedUsage, result.usage);
        const roundCost = this.pricing.calculate({
          provider: provider.name,
          model: result.model,
          inputTokens: result.usage.inputTokens,
          cachedInputTokens: result.usage.cachedInputTokens,
          outputTokens: result.usage.outputTokens,
        });
        costAccumulated = costAccumulated.add(roundCost);
        creditsAccumulated = creditsAccumulated.add(
          this.credits.toCredits(roundCost),
        );

        if (
          result.finishReason !== 'tool_calls' ||
          result.toolCalls.length === 0
        ) {
          finalContent = result.content;
          break;
        }

        messages.push({
          role: 'assistant',
          content: result.content,
          toolCalls: result.toolCalls,
        });

        if (round === this.config.maxToolRounds) {
          // Out of rounds: don't execute more tools (there's no round left
          // for the model to see the results), answer with what we have.
          finalContent =
            result.content ??
            'No pude completar tu consulta con la información disponible en este momento.';
          break;
        }

        for (const call of result.toolCalls) {
          if (toolCallsExecuted >= this.config.maxToolCallsPerRequest) {
            messages.push(
              this.toolResultMessage(call, {
                error: 'TOOL_CALL_LIMIT_EXCEEDED',
              }),
            );
            continue;
          }
          toolCallsExecuted++;
          const toolContent = await this.executeToolCall(context, call);
          messages.push(this.toolResultMessage(call, toolContent));
        }
      }

      await this.quota.settle(context.companyId, estimate, {
        credits: creditsAccumulated,
        costUsd: costAccumulated,
      });
      await this.usage.record({
        companyId: context.companyId,
        userId: context.userId,
        provider: provider.name,
        model: this.modelFor(provider),
        operation: 'chat',
        inputTokens: accumulatedUsage.inputTokens,
        cachedInputTokens: accumulatedUsage.cachedInputTokens,
        outputTokens: accumulatedUsage.outputTokens,
        totalTokens: accumulatedUsage.totalTokens,
        estimatedCostUsd: costAccumulated,
        creditsUsed: creditsAccumulated,
        status: 'SUCCESS',
      });
      await this.audit.record({
        companyId: context.companyId,
        actorUserId: context.userId,
        sessionId: context.sessionId,
        eventType: 'AI_REQUEST',
        result: 'SUCCESS',
        metadata: { operation: 'chat', toolCallsExecuted },
      });

      const status = await this.subscriptions.getUsageStatus(context.companyId);
      return {
        reply: finalContent ?? '',
        usage: {
          creditsUsed: Math.round(creditsAccumulated.toNumber() * 100) / 100,
          creditsRemaining: status.remaining,
          percentageUsed: status.percentageUsed,
        },
      };
    } catch (error) {
      // The ledger must reflect what actually happened: if N rounds already
      // produced real, billable usage before a later round failed, that
      // cost is real and gets settled — only a request that never got a
      // single successful provider response releases its full reservation
      // untouched. See docs/pampa-ai-architecture.md §Cost accounting.
      if (costAccumulated.isZero()) {
        await this.quota.release(context.companyId, estimate);
      } else {
        await this.quota.settle(context.companyId, estimate, {
          credits: creditsAccumulated,
          costUsd: costAccumulated,
        });
      }
      await this.usage.record({
        companyId: context.companyId,
        userId: context.userId,
        provider: provider.name,
        model: this.modelFor(provider),
        operation: 'chat',
        inputTokens: accumulatedUsage.inputTokens,
        cachedInputTokens: accumulatedUsage.cachedInputTokens,
        outputTokens: accumulatedUsage.outputTokens,
        totalTokens: accumulatedUsage.totalTokens,
        estimatedCostUsd: costAccumulated,
        creditsUsed: creditsAccumulated,
        status: 'ERROR',
        errorCode:
          error instanceof AiDomainError
            ? errorCodeOf(error)
            : 'AI_PROVIDER_ERROR',
      });
      await this.audit.record({
        companyId: context.companyId,
        actorUserId: context.userId,
        sessionId: context.sessionId,
        eventType: 'AI_PROVIDER_ERROR',
        result: 'FAILURE',
      });
      throw error instanceof AiDomainError ? error : new AiProviderError();
    }
  }

  /**
   * Carga inteligente de stock: single-shot structured extraction (no tool
   * loop, no conversation history). Same plan-based routing as chat() —
   * see selectProviderForPlan() — and the same reasoning applies to why
   * there's no cross-plan fallback: a Free company's extraction never
   * silently spends real OpenAI money just because Gemini had a bad
   * moment. Quota is checked and reserved before the provider call.
   */
  async extractProducts(
    context: SecurityContext,
    input: AiExtractionInput,
  ): Promise<AiExtractionResult> {
    const subscription = await this.subscriptions.requireEnabled(
      context.companyId,
    );
    const provider = this.selectProviderForPlan(subscription.plan_code);
    if (!this.isProviderConfigured(provider)) {
      throw new AiProviderNotConfiguredError();
    }
    await this.enforceExtractionRateLimit(context);

    const messages = this.buildExtractionMessages(input);
    return this.callExtractionProvider(context, provider, messages, input);
  }

  private buildExtractionMessages(input: AiExtractionInput): AiMessage[] {
    const userContent: AiMessage & { role: 'user' } = input.image
      ? {
          role: 'user',
          content: [
            ...(input.text
              ? [{ type: 'text' as const, text: input.text }]
              : []),
            {
              type: 'image' as const,
              mimeType: input.image.mimeType,
              dataBase64: input.image.dataBase64,
            },
          ],
        }
      : { role: 'user', content: input.text ?? '' };

    return [
      { role: 'system', content: AI_EXTRACTION_SYSTEM_PROMPT },
      userContent,
    ];
  }

  private async callExtractionProvider(
    context: SecurityContext,
    provider: AiProvider,
    messages: AiMessage[],
    input: AiExtractionInput,
  ): Promise<AiExtractionResult> {
    const estimate = this.estimateExtractionWorstCase(provider, input);
    await this.reserveQuota(context, estimate);

    let usage = zeroUsage();
    let costUsd = new Prisma.Decimal(0);
    let credits = new Prisma.Decimal(0);
    let resultModel = this.modelFor(provider);

    try {
      const result = await provider.complete({
        messages,
        maxOutputTokens: this.config.extractionMaxOutputTokens,
        responseFormat: 'json',
      });
      usage = result.usage;
      resultModel = result.model;
      costUsd = this.pricing.calculate({
        provider: provider.name,
        model: result.model,
        inputTokens: usage.inputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        outputTokens: usage.outputTokens,
      });
      credits = this.credits.toCredits(costUsd);

      const parsed = parseExtractionResponse(result.content, provider.name);

      await this.quota.settle(context.companyId, estimate, {
        credits,
        costUsd,
      });
      await this.usage.record({
        companyId: context.companyId,
        userId: context.userId,
        provider: provider.name,
        model: resultModel,
        operation: 'stock_extraction',
        inputTokens: usage.inputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        estimatedCostUsd: costUsd,
        creditsUsed: credits,
        status: 'SUCCESS',
      });
      await this.audit.record({
        companyId: context.companyId,
        actorUserId: context.userId,
        sessionId: context.sessionId,
        eventType: 'AI_REQUEST',
        result: 'SUCCESS',
        metadata: { operation: 'stock_extraction', provider: provider.name },
      });
      return parsed;
    } catch (error) {
      if (costUsd.isZero()) {
        await this.quota.release(context.companyId, estimate);
      } else {
        await this.quota.settle(context.companyId, estimate, {
          credits,
          costUsd,
        });
      }
      await this.usage.record({
        companyId: context.companyId,
        userId: context.userId,
        provider: provider.name,
        model: resultModel,
        operation: 'stock_extraction',
        inputTokens: usage.inputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        estimatedCostUsd: costUsd,
        creditsUsed: credits,
        status: 'ERROR',
        errorCode:
          error instanceof AiDomainError
            ? errorCodeOf(error)
            : 'AI_PROVIDER_ERROR',
      });
      await this.audit.record({
        companyId: context.companyId,
        actorUserId: context.userId,
        sessionId: context.sessionId,
        eventType: 'AI_PROVIDER_ERROR',
        result: 'FAILURE',
        metadata: { operation: 'stock_extraction', provider: provider.name },
      });
      throw error instanceof AiDomainError ? error : new AiProviderError();
    }
  }

  private estimateExtractionWorstCase(
    provider: AiProvider,
    input: AiExtractionInput,
  ): AiQuotaEstimate {
    const textChars =
      (input.text?.length ?? 0) + AI_EXTRACTION_SYSTEM_PROMPT.length;
    const estimatedInputTokens =
      Math.ceil(textChars / CHARS_PER_TOKEN_ESTIMATE) +
      (input.image ? EXTRACTION_IMAGE_TOKEN_ESTIMATE : 0);
    const costUsd = this.pricing.estimateMax({
      provider: provider.name,
      model: this.modelFor(provider),
      estimatedInputTokens,
      maxOutputTokens: this.config.extractionMaxOutputTokens,
    });
    return { credits: this.credits.toCredits(costUsd), costUsd };
  }

  private async enforceExtractionRateLimit(context: SecurityContext) {
    try {
      await this.rateLimit.consume({
        action: 'ai.extract.company',
        key: context.companyId,
        limit: this.config.rateLimitCompanyPerMinute,
        windowMs: RATE_LIMIT_WINDOW_MS,
      });
      await this.rateLimit.consume({
        action: 'ai.extract.user',
        key: context.userId,
        limit: this.config.rateLimitUserPerMinute,
        windowMs: RATE_LIMIT_WINDOW_MS,
      });
    } catch {
      await this.audit.record({
        companyId: context.companyId,
        actorUserId: context.userId,
        sessionId: context.sessionId,
        eventType: 'AI_RATE_LIMITED',
        result: 'BLOCKED',
      });
      throw new AiRateLimitedError();
    }
  }

  private async enforceRateLimit(context: SecurityContext) {
    try {
      await this.rateLimit.consume({
        action: 'ai.chat.company',
        key: context.companyId,
        limit: this.config.rateLimitCompanyPerMinute,
        windowMs: RATE_LIMIT_WINDOW_MS,
      });
      await this.rateLimit.consume({
        action: 'ai.chat.user',
        key: context.userId,
        limit: this.config.rateLimitUserPerMinute,
        windowMs: RATE_LIMIT_WINDOW_MS,
      });
    } catch {
      await this.audit.record({
        companyId: context.companyId,
        actorUserId: context.userId,
        sessionId: context.sessionId,
        eventType: 'AI_RATE_LIMITED',
        result: 'BLOCKED',
      });
      throw new AiRateLimitedError();
    }
  }

  private async reserveQuota(
    context: SecurityContext,
    estimate: AiQuotaEstimate,
  ) {
    try {
      await this.quota.reserve(context.companyId, estimate);
    } catch (error) {
      await this.audit.record({
        companyId: context.companyId,
        actorUserId: context.userId,
        sessionId: context.sessionId,
        eventType:
          error instanceof AiCostLimitExceededError
            ? 'AI_COST_LIMIT_EXCEEDED'
            : 'AI_QUOTA_EXCEEDED',
        result: 'BLOCKED',
      });
      throw error;
    }
  }

  /**
   * Executes one model-requested tool call. This is the only place a tool
   * handler is ever invoked — see docs/pampa-ai-architecture.md §Seguridad
   * for the mandatory flow. `context` always comes from the authenticated
   * request; `call.arguments` is sanitized (company_id/user_id stripped)
   * before the handler ever sees it, so a model can never redirect a query
   * at another tenant even if it hallucinates those fields.
   */
  private async executeToolCall(
    context: SecurityContext,
    call: AiToolCall,
  ): Promise<unknown> {
    const tool = this.tools.get(call.name);
    if (!tool) {
      return { error: 'TOOL_NOT_FOUND' };
    }

    if (!context.permissions.includes(tool.permission)) {
      await this.audit.record({
        companyId: context.companyId,
        actorUserId: context.userId,
        sessionId: context.sessionId,
        eventType: 'AI_TOOL_PERMISSION_DENIED',
        result: 'BLOCKED',
        metadata: { tool: tool.name },
      });
      return { error: 'PERMISSION_DENIED' };
    }

    const sanitizedArgs = sanitizeToolArguments(call.arguments);
    const startedAt = Date.now();
    try {
      const content = await this.withTimeout(
        tool.handler(sanitizedArgs, context),
        tool.timeoutMs ?? this.config.toolTimeoutMs,
      );
      await this.audit.record({
        companyId: context.companyId,
        actorUserId: context.userId,
        sessionId: context.sessionId,
        eventType: 'AI_TOOL_CALLED',
        result: 'SUCCESS',
        metadata: { tool: tool.name, durationMs: Date.now() - startedAt },
      });
      return content;
    } catch (error) {
      const errorCode =
        error instanceof ToolTimeoutError ? 'TOOL_TIMEOUT' : 'TOOL_ERROR';
      await this.audit.record({
        companyId: context.companyId,
        actorUserId: context.userId,
        sessionId: context.sessionId,
        eventType: 'AI_TOOL_CALLED',
        result: 'FAILURE',
        metadata: {
          tool: tool.name,
          errorCode,
          durationMs: Date.now() - startedAt,
        },
      });
      return { error: errorCode };
    }
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new ToolTimeoutError()), timeoutMs);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error: unknown) => {
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error(String(error)));
        },
      );
    });
  }

  private toolResultMessage(call: AiToolCall, content: unknown): AiMessage {
    return { role: 'tool', toolCallId: call.id, name: call.name, content };
  }

  private addUsage(target: AiUsage, delta: AiUsage) {
    target.inputTokens += delta.inputTokens;
    target.cachedInputTokens += delta.cachedInputTokens;
    target.outputTokens += delta.outputTokens;
    target.totalTokens += delta.totalTokens;
  }

  private estimateWorstCase(
    provider: AiProvider,
    message: string,
    context: AiConversationTurn[],
  ): AiQuotaEstimate {
    const contextChars = context.reduce(
      (sum, turn) => sum + turn.content.length,
      0,
    );
    const baseInputTokens = Math.ceil(
      (message.length + contextChars) / CHARS_PER_TOKEN_ESTIMATE,
    );
    const estimatedInputTokens =
      baseInputTokens +
      TOOL_RESULT_TOKEN_BUDGET_PER_ROUND * this.config.maxToolRounds;
    const maxOutputTokens =
      this.config.chatMaxOutputTokens * this.config.maxToolRounds;

    const costUsd = this.pricing.estimateMax({
      provider: provider.name,
      model: this.modelFor(provider),
      estimatedInputTokens,
      maxOutputTokens,
    });
    return { credits: this.credits.toCredits(costUsd), costUsd };
  }
}

function errorCodeOf(error: AiDomainError): string {
  const response = error.getResponse();
  if (typeof response === 'object' && response !== null && 'code' in response) {
    return String(response.code);
  }
  return 'AI_PROVIDER_ERROR';
}
