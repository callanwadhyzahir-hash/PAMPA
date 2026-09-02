import type { AiToolCall, AiToolDefinition } from './ai-tool.interface';

export interface AiUsage {
  inputTokens: number;
  /** Subset of inputTokens served from the provider's prompt cache, billed at a lower rate. */
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/** One block of a multimodal user message — see AiUserContent. */
export type AiContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; mimeType: string; dataBase64: string };

/** A user message is plain text, or text mixed with images (structured extraction from a photo/scan). */
export type AiUserContent = string | AiContentPart[];

/**
 * Provider-agnostic conversation message. AiGatewayService builds an
 * AiMessage[] transcript for the tool-calling loop; each AiProvider
 * translates it to its own SDK's message format.
 */
export type AiMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: AiUserContent }
  | { role: 'assistant'; content: string | null; toolCalls?: AiToolCall[] }
  | { role: 'tool'; toolCallId: string; name: string; content: unknown };

export interface AiCompleteRequest {
  messages: AiMessage[];
  /** Omit or pass an empty array to disable tool calling for this call. */
  tools?: AiToolDefinition[];
  maxOutputTokens: number;
  /** 'json' asks the provider's native structured-output mode for a single JSON object — used by extraction calls (see AiGatewayService.extractProducts), never by the chat tool-calling loop. */
  responseFormat?: 'text' | 'json';
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
 * Adding a provider means writing a new class implementing this interface
 * and registering it in ai.module.ts — AiGatewayService picks between
 * registered providers itself (see selectProviderForPlan()), so
 * AiToolRegistry and every ERP module stay untouched.
 */
export interface AiProvider {
  readonly name: string;
  complete(request: AiCompleteRequest): Promise<AiCompleteResult>;
}
