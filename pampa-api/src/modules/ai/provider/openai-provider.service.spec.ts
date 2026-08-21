import type { AiConfigService } from '../ai.config';
import { AiProviderError, AiProviderNotConfiguredError } from '../ai.errors';
import type { AiToolDefinition } from './ai-tool.interface';
import { OpenAiProvider } from './openai-provider.service';

const TOOL: AiToolDefinition = {
  name: 'search_products',
  description: 'Busca productos.',
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string', description: 'Texto a buscar.' } },
  },
};

describe('OpenAiProvider', () => {
  it('throws AI_PROVIDER_NOT_CONFIGURED without ever constructing an OpenAI client when no API key is set', async () => {
    const requireApiKey = jest.fn();
    const config = {
      configured: false,
      requireApiKey,
    } as unknown as AiConfigService;
    const provider = new OpenAiProvider(config);

    await expect(
      provider.complete({
        messages: [{ role: 'user', content: 'hola' }],
        maxOutputTokens: 100,
      }),
    ).rejects.toBeInstanceOf(AiProviderNotConfiguredError);
    expect(requireApiKey).not.toHaveBeenCalled();
  });

  it('maps OpenAI usage fields (including cached tokens) onto AiCompleteResult', async () => {
    const config = {
      configured: true,
      requireApiKey: () => 'sk-test',
      generalModel: 'gpt-5-mini',
    } as unknown as AiConfigService;
    const provider = new OpenAiProvider(config);

    const create = jest.fn().mockResolvedValue({
      model: 'gpt-5-mini-2025-08-01',
      choices: [{ message: { content: 'hola!' }, finish_reason: 'stop' }],
      usage: {
        prompt_tokens: 120,
        completion_tokens: 30,
        total_tokens: 150,
        prompt_tokens_details: { cached_tokens: 40 },
      },
    });
    (provider as unknown as { client: unknown }).client = {
      chat: { completions: { create } },
    };

    const result = await provider.complete({
      messages: [{ role: 'user', content: 'hola' }],
      maxOutputTokens: 100,
    });

    expect(result).toEqual({
      model: 'gpt-5-mini-2025-08-01',
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

  it('translates AiToolDefinition[] into OpenAI function tools and requests tool_choice=auto', async () => {
    const config = {
      configured: true,
      requireApiKey: () => 'sk-test',
      generalModel: 'gpt-5-mini',
    } as unknown as AiConfigService;
    const provider = new OpenAiProvider(config);
    const create = jest
      .fn<Promise<unknown>, [{ tools?: unknown[]; tool_choice?: string }]>()
      .mockResolvedValue({
        model: 'gpt-5-mini',
        choices: [{ message: { content: null }, finish_reason: 'stop' }],
        usage: undefined,
      });
    (provider as unknown as { client: unknown }).client = {
      chat: { completions: { create } },
    };

    await provider.complete({
      messages: [{ role: 'user', content: 'hola' }],
      tools: [TOOL],
      maxOutputTokens: 100,
    });

    const callArgs = create.mock.calls[0][0];
    expect(callArgs.tool_choice).toBe('auto');
    expect(callArgs.tools).toEqual([
      {
        type: 'function',
        function: {
          name: TOOL.name,
          description: TOOL.description,
          parameters: TOOL.inputSchema,
        },
      },
    ]);
  });

  it('parses tool_calls from the response into AiToolCall[] with parsed JSON arguments', async () => {
    const config = {
      configured: true,
      requireApiKey: () => 'sk-test',
      generalModel: 'gpt-5-mini',
    } as unknown as AiConfigService;
    const provider = new OpenAiProvider(config);
    const create = jest.fn().mockResolvedValue({
      model: 'gpt-5-mini',
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'search_products',
                  arguments: '{"query":"tornillo"}',
                },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });
    (provider as unknown as { client: unknown }).client = {
      chat: { completions: { create } },
    };

    const result = await provider.complete({
      messages: [{ role: 'user', content: 'buscá tornillo' }],
      tools: [TOOL],
      maxOutputTokens: 100,
    });

    expect(result.finishReason).toBe('tool_calls');
    expect(result.toolCalls).toEqual([
      {
        id: 'call_1',
        name: 'search_products',
        arguments: { query: 'tornillo' },
      },
    ]);
  });

  it('treats malformed tool-call JSON arguments as empty arguments instead of throwing', async () => {
    const config = {
      configured: true,
      requireApiKey: () => 'sk-test',
      generalModel: 'gpt-5-mini',
    } as unknown as AiConfigService;
    const provider = new OpenAiProvider(config);
    const create = jest.fn().mockResolvedValue({
      model: 'gpt-5-mini',
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'search_products', arguments: 'not-json{' },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });
    (provider as unknown as { client: unknown }).client = {
      chat: { completions: { create } },
    };

    const result = await provider.complete({
      messages: [{ role: 'user', content: 'hola' }],
      tools: [TOOL],
      maxOutputTokens: 100,
    });

    expect(result.toolCalls).toEqual([
      { id: 'call_1', name: 'search_products', arguments: {} },
    ]);
  });

  it('serializes assistant tool_calls and tool-result messages into the OpenAI wire format', async () => {
    const config = {
      configured: true,
      requireApiKey: () => 'sk-test',
      generalModel: 'gpt-5-mini',
    } as unknown as AiConfigService;
    const provider = new OpenAiProvider(config);
    const create = jest
      .fn<Promise<unknown>, [{ messages: unknown[] }]>()
      .mockResolvedValue({
        model: 'gpt-5-mini',
        choices: [{ message: { content: 'listo' }, finish_reason: 'stop' }],
        usage: undefined,
      });
    (provider as unknown as { client: unknown }).client = {
      chat: { completions: { create } },
    };

    await provider.complete({
      messages: [
        { role: 'system', content: 'sos PAMPA IA' },
        { role: 'user', content: 'hola' },
        {
          role: 'assistant',
          content: null,
          toolCalls: [
            {
              id: 'call_1',
              name: 'search_products',
              arguments: { query: 'x' },
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

    const callArgs = create.mock.calls[0][0];
    expect(callArgs.messages).toEqual([
      { role: 'system', content: 'sos PAMPA IA' },
      { role: 'user', content: 'hola' },
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'search_products', arguments: '{"query":"x"}' },
          },
        ],
      },
      {
        role: 'tool',
        tool_call_id: 'call_1',
        content: JSON.stringify({ products: [] }),
      },
    ]);
  });

  it('wraps a transport/API failure as AI_PROVIDER_ERROR without leaking the underlying error message', async () => {
    const config = {
      configured: true,
      requireApiKey: () => 'sk-test',
      generalModel: 'gpt-5-mini',
    } as unknown as AiConfigService;
    const provider = new OpenAiProvider(config);
    (provider as unknown as { client: unknown }).client = {
      chat: {
        completions: {
          create: jest
            .fn()
            .mockRejectedValue(new Error('super secret upstream detail')),
        },
      },
    };

    await expect(
      provider.complete({
        messages: [{ role: 'user', content: 'hola' }],
        maxOutputTokens: 100,
      }),
    ).rejects.toBeInstanceOf(AiProviderError);
  });
});
