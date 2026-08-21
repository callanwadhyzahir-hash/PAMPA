import type { AiToolCall, AiToolDefinition } from './ai-tool.interface';

export interface AiUsage {
  inputTokens: number;
  /** Subset of inputTokens served from the provider's prompt cache, billed at a lower rate. */
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Provider-agnostic conversation message. AiGatewayService builds an
 * AiMessage[] transcript for the tool-calling loop; each AiProvider
 * translates it to its own SDK's message format.
 */
export type AiMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; toolCalls?: AiToolCall[] }
  | { role: 'tool'; toolCallId: string; name: string; content: unknown };

export interface AiCompleteRequest {
  messages: AiMessage[];
  /** Omit or pass an empty array to disable tool calling for this call. */
  tools?: AiToolDefinition[];
  maxOutputTokens: number;
}

export type AiFinishReason = 'stop' | 'tool_calls' | 'length';

export interface AiCompleteResult {
  /** The exact model string the provider actually served the request with — used for pricing lookup, not AiConfigService.generalModel (which is the requested model). */
  model: string;
  content: string | null;
  toolCalls: AiToolCall[];
  finishReason: AiFinishReason;
  usage: AiUsage;
}

/**
 * The only door PAMPA has to an external AI provider's API. AiGatewayService
 * is the only caller — no controller, ERP module, or other service may
 * import a provider SDK or call complete() directly (see
 * docs/pampa-ai-architecture.md).
 *
 * Adding a second provider (Gemini, a self-hosted model, ...) means writing
 * a new class implementing this interface and pointing the AI_PROVIDER
 * token at it in ai.module.ts — AiGatewayService, AiToolRegistry and every
 * ERP module stay untouched.
 */
export interface AiProvider {
  readonly name: string;
  complete(request: AiCompleteRequest): Promise<AiCompleteResult>;
}
