import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

import { AiConfigService } from '../ai.config';
import { AiProviderError, AiProviderNotConfiguredError } from '../ai.errors';
import type { AiToolCall, AiToolDefinition } from './ai-tool.interface';
import type {
  AiCompleteRequest,
  AiCompleteResult,
  AiFinishReason,
  AiMessage,
  AiProvider,
} from './ai-provider.interface';

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type ChatTool = OpenAI.Chat.Completions.ChatCompletionTool;

/**
 * The only class in PAMPA that imports the `openai` SDK. Lazily constructs
 * the client on first use (never at module boot) so a missing
 * OPENAI_API_KEY never crashes the ERP — see AiConfigService.
 *
 * Translates PAMPA's provider-agnostic AiMessage/AiToolDefinition/AiToolCall
 * shapes to/from OpenAI's Chat Completions function-calling format. No other
 * file needs to know OpenAI's wire format.
 */
@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiProvider.name);
  private client: OpenAI | null = null;

  constructor(private readonly config: AiConfigService) {}

  private getClient(): OpenAI {
    if (!this.config.configured) {
      throw new AiProviderNotConfiguredError();
    }
    if (!this.client) {
      this.client = new OpenAI({ apiKey: this.config.requireApiKey() });
    }
    return this.client;
  }

  async complete(request: AiCompleteRequest): Promise<AiCompleteResult> {
    const client = this.getClient();

    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await client.chat.completions.create({
        model: this.config.generalModel,
        messages: request.messages.map(toOpenAiMessage),
        max_completion_tokens: request.maxOutputTokens,
        ...(request.tools?.length
          ? { tools: request.tools.map(toOpenAiTool), tool_choice: 'auto' }
          : {}),
        ...(request.responseFormat === 'json'
          ? { response_format: { type: 'json_object' } }
          : {}),
      });
    } catch (error) {
      // Never log error.message/response body: it can echo request content
      // (and, for auth errors, fragments of headers). Only the error class
      // name is safe to record.
      this.logger.error(
        `OpenAI request failed (${error instanceof Error ? error.constructor.name : 'unknown error'})`,
      );
      throw new AiProviderError();
    }

    const choice = response.choices[0];
    const usage = response.usage;

    return {
      model: response.model,
      content: choice?.message?.content ?? null,
      toolCalls: (choice?.message?.tool_calls ?? [])
        .filter(
          (
            call,
          ): call is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall =>
            call.type === 'function',
        )
        .map(toAiToolCall),
      finishReason: toFinishReason(choice?.finish_reason),
      usage: {
        inputTokens: usage?.prompt_tokens ?? 0,
        cachedInputTokens: usage?.prompt_tokens_details?.cached_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
      },
    };
  }
}

function toOpenAiMessage(message: AiMessage): ChatMessage {
  switch (message.role) {
    case 'system':
      return { role: 'system', content: message.content };
    case 'user':
      return {
        role: 'user',
        content:
          typeof message.content === 'string'
            ? message.content
            : message.content.map((part) =>
                part.type === 'text'
                  ? { type: 'text' as const, text: part.text }
                  : {
                      type: 'image_url' as const,
                      image_url: {
                        url: `data:${part.mimeType};base64,${part.dataBase64}`,
                      },
                    },
              ),
      };
    case 'assistant':
      return {
        role: 'assistant',
        content: message.content,
        ...(message.toolCalls?.length
          ? { tool_calls: message.toolCalls.map(toOpenAiToolCall) }
          : {}),
      };
    case 'tool':
      return {
        role: 'tool',
        tool_call_id: message.toolCallId,
        content: JSON.stringify(message.content),
      };
  }
}

function toOpenAiTool(tool: AiToolDefinition): ChatTool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: tool.inputSchema.type,
        properties: tool.inputSchema.properties,
        ...(tool.inputSchema.required
          ? { required: tool.inputSchema.required }
          : {}),
      },
    },
  };
}

function toOpenAiToolCall(
  call: AiToolCall,
): OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall {
  return {
    id: call.id,
    type: 'function',
    function: { name: call.name, arguments: JSON.stringify(call.arguments) },
  };
}

function toAiToolCall(
  call: OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall,
): AiToolCall {
  return {
    id: call.id,
    name: call.function.name,
    arguments: parseToolArguments(call.function.arguments),
  };
}

function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    // A model can produce malformed JSON arguments. Treat as "no arguments"
    // rather than crashing the loop — the tool handler's own validation
    // will reject anything it actually required.
    return {};
  }
}

function toFinishReason(reason: string | undefined): AiFinishReason {
  if (reason === 'tool_calls') return 'tool_calls';
  if (reason === 'length') return 'length';
  return 'stop';
}
