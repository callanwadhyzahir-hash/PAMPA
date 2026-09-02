import type { AiConfigService } from '../ai.config';
import { AiProviderError, AiProviderNotConfiguredError } from '../ai.errors';
import type { AiToolDefinition } from './ai-tool.interface';
import { GeminiProvider } from './gemini-provider.service';

const TOOL: AiToolDefinition = {
  name: 'search_products',
  description: 'Busca productos.',
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string', description: 'Texto a buscar.' } },
    required: ['query'],
  },
};

interface GenerateContentCallArgs {
  contents: unknown[];
  config: {
    systemInstruction?: unknown;
    responseMimeType?: string;
    tools?: unknown[];
  };
}

function providerWithClient(
  generateContent: jest.Mock<Promise<unknown>, [GenerateContentCallArgs]>,
) {
  const config = {
    geminiConfigured: true,
    requireGeminiApiKey: () => 'gm-test',
    geminiModel: 'gemini-3.6-flash',
  } as unknown as AiConfigService;
  const provider = new GeminiProvider(config);
  (provider as unknown as { client: unknown }).client = {
    models: { generateContent },
  };
  return provider;
}

describe('GeminiProvider', () => {
  it('throws AI_PROVIDER_NOT_CONFIGURED without ever constructing a client when no API key is set', async () => {
    const requireGeminiApiKey = jest.fn();
    const config = {
      geminiConfigured: false,
      requireGeminiApiKey,
    } as unknown as AiConfigService;
    const provider = new GeminiProvider(config);

    await expect(
      provider.complete({
        messages: [{ role: 'user', content: 'hola' }],
        maxOutputTokens: 100,
      }),
    ).rejects.toBeInstanceOf(AiProviderNotConfiguredError);
    expect(requireGeminiApiKey).not.toHaveBeenCalled();
  });

  it('maps Gemini usage fields (including cache/thoughts tokens) onto AiCompleteResult', async () => {
    const generateContent = jest
      .fn<Promise<unknown>, [GenerateContentCallArgs]>()
      .mockResolvedValue({
        modelVersion: 'gemini-3.6-flash-002',
        text: 'hola!',
        functionCalls: [],
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: {
          promptTokenCount: 120,
          cachedContentTokenCount: 40,
          candidatesTokenCount: 20,
          thoughtsTokenCount: 10,
          totalTokenCount: 150,
        },
      });
    const provider = providerWithClient(generateContent);

    const result = await provider.complete({
      messages: [{ role: 'user', content: 'hola' }],
      maxOutputTokens: 100,
    });

    expect(result).toEqual({
      model: 'gemini-3.6-flash-002',
      content: 'hola!',
      toolCalls: [],
      finishReason: 'stop',
      usage: {
        inputTokens: 120,
        cachedInputTokens: 40,
        outputTokens: 30,
        totalTokens: 150,
      },
    });
  });

  it('extracts the system message into config.systemInstruction, not the contents array', async () => {
    const generateContent = jest
      .fn<Promise<unknown>, [GenerateContentCallArgs]>()
      .mockResolvedValue({
        text: 'ok',
        functionCalls: [],
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: {},
      });
    const provider = providerWithClient(generateContent);

    await provider.complete({
      messages: [
        { role: 'system', content: 'sos PAMPA IA' },
        { role: 'user', content: 'hola' },
      ],
      maxOutputTokens: 100,
    });

    const call = generateContent.mock.calls[0][0];
    expect(call.config.systemInstruction).toBe('sos PAMPA IA');
    expect(call.contents).toEqual([
      { role: 'user', parts: [{ text: 'hola' }] },
    ]);
  });

  it('sends image parts as inlineData alongside any text part', async () => {
    const generateContent = jest
      .fn<Promise<unknown>, [GenerateContentCallArgs]>()
      .mockResolvedValue({
        text: 'ok',
        functionCalls: [],
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: {},
      });
    const provider = providerWithClient(generateContent);

    await provider.complete({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'que producto es este' },
            { type: 'image', mimeType: 'image/jpeg', dataBase64: 'ZmFrZQ==' },
          ],
        },
      ],
      maxOutputTokens: 100,
    });

    const call = generateContent.mock.calls[0][0];
    expect(call.contents).toEqual([
      {
        role: 'user',
        parts: [
          { text: 'que producto es este' },
          { inlineData: { mimeType: 'image/jpeg', data: 'ZmFrZQ==' } },
        ],
      },
    ]);
  });

  it('requests application/json response mode when responseFormat is json', async () => {
    const generateContent = jest
      .fn<Promise<unknown>, [GenerateContentCallArgs]>()
      .mockResolvedValue({
        text: '{"products":[]}',
        functionCalls: [],
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: {},
      });
    const provider = providerWithClient(generateContent);

    await provider.complete({
      messages: [{ role: 'user', content: 'hola' }],
      maxOutputTokens: 100,
      responseFormat: 'json',
    });

    expect(generateContent.mock.calls[0][0].config.responseMimeType).toBe(
      'application/json',
    );
  });

  it('translates AiToolDefinition[] into Gemini function declarations', async () => {
    const generateContent = jest
      .fn<Promise<unknown>, [GenerateContentCallArgs]>()
      .mockResolvedValue({
        text: null,
        functionCalls: [],
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: {},
      });
    const provider = providerWithClient(generateContent);

    await provider.complete({
      messages: [{ role: 'user', content: 'hola' }],
      tools: [TOOL],
      maxOutputTokens: 100,
    });

    const call = generateContent.mock.calls[0][0];
    expect(call.config.tools).toEqual([
      {
        functionDeclarations: [
          {
            name: 'search_products',
            description: 'Busca productos.',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: { type: 'STRING', description: 'Texto a buscar.' },
              },
              required: ['query'],
            },
          },
        ],
      },
    ]);
  });

  it('reports finishReason tool_calls and parses a functionCall part into AiToolCall[], capturing its thoughtSignature', async () => {
    // Regression: response.functionCalls (the SDK's convenience getter) only
    // returns {id, name, args} — reading it instead of parts would silently
    // drop thoughtSignature and break the round-trip (see toGeminiContent's
    // 'assistant' case), which is exactly what happened live against the
    // real API before this was fixed.
    const generateContent = jest
      .fn<Promise<unknown>, [GenerateContentCallArgs]>()
      .mockResolvedValue({
        text: null,
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                {
                  functionCall: {
                    id: 'call_1',
                    name: 'search_products',
                    args: { query: 'tornillo' },
                  },
                  thoughtSignature: 'opaque-signature-abc',
                },
              ],
            },
          },
        ],
        usageMetadata: {},
      });
    const provider = providerWithClient(generateContent);

    const result = await provider.complete({
      messages: [{ role: 'user', content: 'buscá tornillo' }],
      tools: [TOOL],
      maxOutputTokens: 100,
    });

    expect(result.finishReason).toBe('tool_calls');
    expect(result.content).toBeNull();
    expect(result.toolCalls).toEqual([
      {
        id: 'call_1',
        name: 'search_products',
        arguments: { query: 'tornillo' },
        providerMetadata: { thoughtSignature: 'opaque-signature-abc' },
      },
    ]);
  });

  it("echoes a tool call's thoughtSignature back on the functionCall part when replaying it on a later turn", async () => {
    const generateContent = jest
      .fn<Promise<unknown>, [GenerateContentCallArgs]>()
      .mockResolvedValue({
        text: 'listo',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: {},
      });
    const provider = providerWithClient(generateContent);

    await provider.complete({
      messages: [
        { role: 'user', content: 'buscá tornillo' },
        {
          role: 'assistant',
          content: null,
          toolCalls: [
            {
              id: 'call_1',
              name: 'search_products',
              arguments: { query: 'tornillo' },
              providerMetadata: { thoughtSignature: 'opaque-signature-abc' },
            },
          ],
        },
        {
          role: 'tool',
          toolCallId: 'call_1',
          name: 'search_products',
          content: { products: [] },
        },
      ],
      maxOutputTokens: 100,
    });

    const call = generateContent.mock.calls[0][0];
    expect(call.contents[1]).toEqual({
      role: 'model',
      parts: [
        {
          functionCall: {
            id: 'call_1',
            name: 'search_products',
            args: { query: 'tornillo' },
          },
          thoughtSignature: 'opaque-signature-abc',
        },
      ],
    });
  });

  it('wraps a transport/API failure as AI_PROVIDER_ERROR without leaking the underlying error message', async () => {
    const provider = providerWithClient(
      jest
        .fn<Promise<unknown>, [GenerateContentCallArgs]>()
        .mockRejectedValue(new Error('super secret upstream detail')),
    );

    await expect(
      provider.complete({
        messages: [{ role: 'user', content: 'hola' }],
        maxOutputTokens: 100,
      }),
    ).rejects.toBeInstanceOf(AiProviderError);
  });
});
