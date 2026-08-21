/**
 * Provider-agnostic tool-calling types. AiGatewayService and AiToolRegistry
 * only ever see these shapes — never an OpenAI `ChatCompletionTool` or
 * `ChatCompletionMessageToolCall`. Each AiProvider implementation is
 * responsible for translating to/from its SDK's native format (see
 * OpenAiProvider) so adding Gemini later never touches tool definitions,
 * AiToolRegistry, or any tool handler.
 */

/** A JSON-Schema-subset description of a tool's arguments — deliberately small (string/number/integer/boolean/enum) since every tool argument in this sprint is a simple filter, never a nested structure. */
export interface AiToolPropertySchema {
  type: 'string' | 'number' | 'integer' | 'boolean';
  description?: string;
  enum?: readonly string[];
}

export interface AiToolInputSchema {
  type: 'object';
  properties: Record<string, AiToolPropertySchema>;
  required?: readonly string[];
}

export interface AiToolDefinition {
  name: string;
  description: string;
  inputSchema: AiToolInputSchema;
}

/** A tool invocation the model requested. `arguments` is whatever the model produced — untrusted until validated by the tool's own handler. */
export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** The outcome of executing one AiToolCall, fed back to the model as a `tool` message. `content` must already be minimal/serializable — see docs/pampa-ai-architecture.md §Contexto. */
export interface AiToolResult {
  toolCallId: string;
  name: string;
  content: unknown;
  isError?: boolean;
}
