import { Injectable, Logger } from '@nestjs/common';
import {
  FinishReason,
  GoogleGenAI,
  Type,
  type Content,
  type FunctionCall,
  type FunctionDeclaration,
  type GenerateContentResponse,
  type Part,
} from '@google/genai';

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

/**
 * The only class in PAMPA that imports the `@google/genai` SDK. Mirrors
 * OpenAiProvider's shape exactly (lazy client, same error-swallowing rules)
 * so AiGatewayService can call either provider interchangeably — it picks
 * this one for AI_FREE companies, both for chat() and extraction, see
 * AiGatewayService.selectProviderForPlan().
 */
@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private client: GoogleGenAI | null = null;

  constructor(private readonly config: AiConfigService) {}

  private getClient(): GoogleGenAI {
    if (!this.config.geminiConfigured) {
      throw new AiProviderNotConfiguredError();
    }
    if (!this.client) {
      this.client = new GoogleGenAI({
        apiKey: this.config.requireGeminiApiKey(),
      });
    }
    return this.client;
  }

  async complete(request: AiCompleteRequest): Promise<AiCompleteResult> {
    const client = this.getClient();
    const systemInstruction = request.messages.find(
      (m) => m.role === 'system',
    )?.content;
    const contents = request.messages
      .filter(
        (m): m is Exclude<AiMessage, { role: 'system' }> => m.role !== 'system',
      )
      .map(toGeminiContent);

    let response: GenerateContentResponse;
    try {
      response = await client.models.generateContent({
        model: this.config.geminiModel,
        contents,
        config: {
          maxOutputTokens: request.maxOutputTokens,
          ...(systemInstruction ? { systemInstruction } : {}),
          ...(request.tools?.length
            ? {
                tools: [
                  { functionDeclarations: request.tools.map(toGeminiTool) },
                ],
              }
            : {}),
          ...(request.responseFormat === 'json'
            ? { responseMimeType: 'application/json' }
            : {}),
        },
      });
    } catch (error) {
      // Same privacy rule as OpenAiProvider: never log error.message, it can
      // echo request content back.
      this.logger.error(
        `Gemini request failed (${error instanceof Error ? error.constructor.name : 'unknown error'})`,
      );
      throw new AiProviderError();
    }

    // Reading response.functionCalls (a convenience getter over parts) would
    // silently drop thoughtSignature — a sibling field on the same Part,
    // not on FunctionCall itself, that Gemini requires echoed back verbatim
    // on the next turn or it rejects the request with INVALID_ARGUMENT
    // (verified live against the real API). Reading parts directly keeps
    // the two paired.
    const functionCallParts = (
      response.candidates?.[0]?.content?.parts ?? []
    ).filter(
      (part): part is Part & { functionCall: FunctionCall } =>
        part.functionCall !== undefined,
    );
    const usage = response.usageMetadata;

    return {
      model: response.modelVersion ?? this.config.geminiModel,
      content: functionCallParts.length > 0 ? null : (response.text ?? null),
      toolCalls: functionCallParts.map(toAiToolCall),
      finishReason: toFinishReason(
        functionCallParts.length > 0,
        response.candidates?.[0]?.finishReason,
      ),
      usage: {
        inputTokens: usage?.promptTokenCount ?? 0,
        cachedInputTokens: usage?.cachedContentTokenCount ?? 0,
        outputTokens:
          (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
        totalTokens: usage?.totalTokenCount ?? 0,
      },
    };
  }
}

function toGeminiContent(
  message: Exclude<AiMessage, { role: 'system' }>,
): Content {
  switch (message.role) {
    case 'user':
      return {
        role: 'user',
        parts:
          typeof message.content === 'string'
            ? [{ text: message.content }]
            : message.content.map((part): Part =>
                part.type === 'text'
                  ? { text: part.text }
                  : {
                      inlineData: {
                        mimeType: part.mimeType,
                        data: part.dataBase64,
                      },
                    },
              ),
      };
    case 'assistant': {
      const parts: Part[] = [];
      if (message.content) parts.push({ text: message.content });
      for (const call of message.toolCalls ?? []) {
        const thoughtSignature = thoughtSignatureOf(call.providerMetadata);
        parts.push({
          functionCall: { id: call.id, name: call.name, args: call.arguments },
          ...(thoughtSignature ? { thoughtSignature } : {}),
        });
      }
      return { role: 'model', parts };
    }
    case 'tool':
      return {
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: message.toolCallId,
              name: message.name,
              response: toFunctionResponseObject(message.content),
            },
          },
        ],
      };
  }
}

/** FunctionResponse.response must be a JSON object — wrap non-object tool results under "output" so any tool return value round-trips. */
function toFunctionResponseObject(content: unknown): Record<string, unknown> {
  return typeof content === 'object' &&
    content !== null &&
    !Array.isArray(content)
    ? (content as Record<string, unknown>)
    : { output: content };
}

const TOOL_PROPERTY_TYPE: Record<string, Type> = {
  string: Type.STRING,
  number: Type.NUMBER,
  integer: Type.INTEGER,
  boolean: Type.BOOLEAN,
};

function toGeminiTool(tool: AiToolDefinition): FunctionDeclaration {
  return {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: Type.OBJECT,
      properties: Object.fromEntries(
        Object.entries(tool.inputSchema.properties).map(([key, prop]) => [
          key,
          {
            type: TOOL_PROPERTY_TYPE[prop.type],
            description: prop.description,
            ...(prop.enum ? { enum: [...prop.enum] } : {}),
          },
        ]),
      ),
      ...(tool.inputSchema.required
        ? { required: [...tool.inputSchema.required] }
        : {}),
    },
  };
}

function toAiToolCall(part: Part & { functionCall: FunctionCall }): AiToolCall {
  const call = part.functionCall;
  return {
    id: call.id ?? call.name ?? 'call',
    name: call.name ?? '',
    arguments: call.args ?? {},
    providerMetadata: part.thoughtSignature
      ? { thoughtSignature: part.thoughtSignature }
      : undefined,
  };
}

function thoughtSignatureOf(metadata: unknown): string | undefined {
  return typeof metadata === 'object' &&
    metadata !== null &&
    typeof (metadata as { thoughtSignature?: unknown }).thoughtSignature ===
      'string'
    ? (metadata as { thoughtSignature: string }).thoughtSignature
    : undefined;
}

function toFinishReason(
  hasFunctionCalls: boolean,
  reason: FinishReason | undefined,
): AiFinishReason {
  if (hasFunctionCalls) return 'tool_calls';
  if (reason === FinishReason.MAX_TOKENS) return 'length';
  return 'stop';
}
