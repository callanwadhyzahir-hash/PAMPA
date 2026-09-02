import { Prisma } from '@prisma/client';

import type { SecurityAuditService } from '../../auth/audit/security-audit.service';
import type { RateLimitService } from '../../auth/rate-limit/rate-limit.service';
import type { SecurityContext } from '../../auth/types/security-context';
import type { AiConfigService } from '../ai.config';
import {
  AiCostLimitExceededError,
  AiDisabledError,
  AiInvalidResponseError,
  AiProviderError,
  AiProviderNotConfiguredError,
  AiQuotaExceededError,
  AiRateLimitedError,
} from '../ai.errors';
import type { AiCreditsService } from '../credits/ai-credits.service';
import type { AiPricingService } from '../pricing/ai-pricing.service';
import type {
  AiCompleteRequest,
  AiCompleteResult,
} from '../provider/ai-provider.interface';
import type { GeminiProvider } from '../provider/gemini-provider.service';
import type { OpenAiProvider } from '../provider/openai-provider.service';
import type {
  AiQuotaEstimate,
  AiQuotaService,
} from '../quota/ai-quota.service';
import type { AiSubscriptionService } from '../subscription/ai-subscription.service';
import type { AiTool } from '../tools/ai-tool';
import type { AiToolRegistry } from '../tools/ai-tool-registry';
import type { RecordUsageInput } from '../usage/ai-usage.repository';
import type { AiUsageRepository } from '../usage/ai-usage.repository';
import { AiGatewayService } from './ai-gateway.service';

const context: SecurityContext = {
  userId: 'user-1',
  companyId: 'company-1',
  branchId: null,
  sessionId: 'session-1',
  tokenVersion: 0,
  email: 'a@a.com',
  roles: [],
  permissions: ['ai.use', 'products.read'],
  isPlatformAdmin: false,
};

function stopResult(
  overrides: Partial<AiCompleteResult> = {},
): AiCompleteResult {
  return {
    model: 'gpt-5-mini',
    content: 'respuesta final',
    toolCalls: [],
    finishReason: 'stop',
    usage: {
      inputTokens: 50,
      cachedInputTokens: 0,
      outputTokens: 20,
      totalTokens: 70,
    },
    ...overrides,
  };
}

function toolCallResult(
  name: string,
  args: Record<string, unknown> = {},
): AiCompleteResult {
  return {
    model: 'gpt-5-mini',
    content: null,
    toolCalls: [{ id: `call_${name}`, name, arguments: args }],
    finishReason: 'tool_calls',
    usage: {
      inputTokens: 40,
      cachedInputTokens: 0,
      outputTokens: 10,
      totalTokens: 50,
    },
  };
}

function makeSearchProductsTool(overrides: Partial<AiTool> = {}): AiTool {
  return {
    name: 'search_products',
    description: 'Busca productos.',
    inputSchema: { type: 'object', properties: {} },
    permission: 'products.read',
    readOnly: true,
    handler: jest.fn().mockResolvedValue({ products: [] }),
    ...overrides,
  };
}

// Deliberately plain object literals (never cast to the real class type) so
// TypeScript keeps every property typed as `jest.Mock` in test bodies —
// casting to the class type here would make @typescript-eslint/unbound-method
// flag every `expect(deps.x.y).toHaveBeenCalledWith(...)` below.
function makeDeps(tools: AiTool[] = []) {
  const config = {
    configured: true,
    generalModel: 'gpt-5-mini',
    chatMaxOutputTokens: 700,
    extractionMaxOutputTokens: 4000,
    rateLimitCompanyPerMinute: 20,
    rateLimitUserPerMinute: 6,
    maxToolRounds: 5,
    maxToolCallsPerRequest: 10,
    toolTimeoutMs: 8000,
    maxConversationContextMessages: 10,
    geminiConfigured: true,
    geminiModel: 'gemini-3.6-flash',
  };

  const subscriptions = {
    // AI_PRO by default so every pre-existing test (written when there was
    // a single ambient provider) keeps exercising deps.provider/openai —
    // tests that care about routing set plan_code explicitly.
    requireEnabled: jest.fn().mockResolvedValue({ plan_code: 'AI_PRO' }),
    getUsageStatus: jest.fn().mockResolvedValue({
      enabled: true,
      plan: 'AI_FREE',
      creditsUsed: 10,
      creditsLimit: 100,
      percentageUsed: 10,
      periodStart: new Date(),
      periodEnd: new Date(),
      remaining: 90,
    }),
  };

  const quota = {
    reserve: jest.fn().mockResolvedValue(undefined),
    settle: jest
      .fn<Promise<void>, [string, AiQuotaEstimate, AiQuotaEstimate]>()
      .mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  };

  const pricing = {
    calculate: jest.fn().mockReturnValue(new Prisma.Decimal('0.002')),
    estimateMax: jest
      .fn<
        Prisma.Decimal,
        [{ estimatedInputTokens: number; maxOutputTokens: number }]
      >()
      .mockReturnValue(new Prisma.Decimal('0.02')),
  };

  const credits = {
    toCredits: jest.fn().mockReturnValue(new Prisma.Decimal('2')),
  };

  const usage = {
    record: jest
      .fn<Promise<void>, [RecordUsageInput]>()
      .mockResolvedValue(undefined),
  };

  const rateLimit = { consume: jest.fn().mockResolvedValue(undefined) };

  const audit = { record: jest.fn().mockResolvedValue(undefined) };

  const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
  const registry = {
    get: jest.fn((name: string) => toolMap.get(name)),
    toDefinitions: jest.fn(() =>
      tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    ),
    register: jest.fn(),
    list: jest.fn(() => tools),
  };

  const provider = {
    name: 'openai',
    complete: jest
      .fn<Promise<AiCompleteResult>, [AiCompleteRequest]>()
      .mockResolvedValue(stopResult()),
  };

  const geminiProvider = {
    name: 'gemini',
    complete: jest
      .fn<Promise<AiCompleteResult>, [AiCompleteRequest]>()
      .mockResolvedValue(
        stopResult({ model: 'gemini-3.6-flash', content: '{"products":[]}' }),
      ),
  };

  return {
    config,
    subscriptions,
    quota,
    pricing,
    credits,
    usage,
    rateLimit,
    audit,
    registry,
    provider,
    geminiProvider,
  };
}

function makeGateway(deps: ReturnType<typeof makeDeps>) {
  return new AiGatewayService(
    deps.config as unknown as AiConfigService,
    deps.subscriptions as unknown as AiSubscriptionService,
    deps.quota as unknown as AiQuotaService,
    deps.pricing as unknown as AiPricingService,
    deps.credits as unknown as AiCreditsService,
    deps.usage as unknown as AiUsageRepository,
    deps.rateLimit as unknown as RateLimitService,
    deps.audit as unknown as SecurityAuditService,
    deps.registry as unknown as AiToolRegistry,
    deps.provider as unknown as OpenAiProvider,
    deps.geminiProvider as unknown as GeminiProvider,
  );
}

describe('AiGatewayService.chat — basic flow', () => {
  it('runs the full flow: enabled check -> rate limit -> reserve -> provider -> settle -> record -> audit', async () => {
    const deps = makeDeps();
    const gateway = makeGateway(deps);

    const result = await gateway.chat(context, 'hola');

    expect(deps.subscriptions.requireEnabled).toHaveBeenCalledWith('company-1');
    expect(deps.rateLimit.consume).toHaveBeenCalledTimes(2);
    expect(deps.quota.reserve).toHaveBeenCalledWith(
      'company-1',
      expect.any(Object),
    );
    expect(deps.provider.complete).toHaveBeenCalledTimes(1);
    expect(deps.quota.settle).toHaveBeenCalled();
    expect(deps.usage.record).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        userId: 'user-1',
        status: 'SUCCESS',
      }),
    );
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'AI_REQUEST', result: 'SUCCESS' }),
    );
    expect(result.reply).toBe('respuesta final');
    expect(result.usage.creditsRemaining).toBe(90);
  });

  it('never lets the raw message text reach the usage ledger', async () => {
    const deps = makeDeps();
    const gateway = makeGateway(deps);

    await gateway.chat(context, 'contenido sensible del prompt');

    const recordedArgs = deps.usage.record.mock.calls[0][0];
    expect(JSON.stringify(recordedArgs)).not.toContain('contenido sensible');
  });

  it('throws AI_DISABLED and never calls the provider when the company has no AI subscription', async () => {
    const deps = makeDeps();
    deps.subscriptions.requireEnabled.mockRejectedValue(new AiDisabledError());
    const gateway = makeGateway(deps);

    await expect(gateway.chat(context, 'hola')).rejects.toBeInstanceOf(
      AiDisabledError,
    );
    expect(deps.provider.complete).not.toHaveBeenCalled();
  });

  it('throws AI_PROVIDER_NOT_CONFIGURED when OPENAI_API_KEY is missing, without consuming rate limit or quota', async () => {
    const deps = makeDeps();
    deps.config.configured = false;
    const gateway = makeGateway(deps);

    await expect(gateway.chat(context, 'hola')).rejects.toBeInstanceOf(
      AiProviderNotConfiguredError,
    );
    expect(deps.rateLimit.consume).not.toHaveBeenCalled();
    expect(deps.quota.reserve).not.toHaveBeenCalled();
  });

  it('surfaces AI_RATE_LIMITED and audits it when the rate limiter blocks the request', async () => {
    const deps = makeDeps();
    deps.rateLimit.consume.mockRejectedValue(new Error('429'));
    const gateway = makeGateway(deps);

    await expect(gateway.chat(context, 'hola')).rejects.toBeInstanceOf(
      AiRateLimitedError,
    );
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AI_RATE_LIMITED',
        result: 'BLOCKED',
      }),
    );
    expect(deps.provider.complete).not.toHaveBeenCalled();
  });

  it.each([
    [new AiQuotaExceededError(), 'AI_QUOTA_EXCEEDED'],
    [new AiCostLimitExceededError(), 'AI_COST_LIMIT_EXCEEDED'],
  ])(
    'propagates %p from quota.reserve and audits %s without calling the provider',
    async (error, eventType) => {
      const deps = makeDeps();
      deps.quota.reserve.mockRejectedValue(error);
      const gateway = makeGateway(deps);

      await expect(gateway.chat(context, 'hola')).rejects.toBe(error);
      expect(deps.audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ eventType, result: 'BLOCKED' }),
      );
      expect(deps.provider.complete).not.toHaveBeenCalled();
    },
  );

  it('releases the reservation and records a failed ledger row when the first provider call fails', async () => {
    const deps = makeDeps();
    deps.provider.complete.mockRejectedValue(new AiProviderError());
    const gateway = makeGateway(deps);

    await expect(gateway.chat(context, 'hola')).rejects.toBeInstanceOf(
      AiProviderError,
    );
    expect(deps.quota.release).toHaveBeenCalled();
    expect(deps.quota.settle).not.toHaveBeenCalled();
    expect(deps.usage.record).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ERROR',
        errorCode: 'AI_PROVIDER_ERROR',
      }),
    );
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AI_PROVIDER_ERROR',
        result: 'FAILURE',
      }),
    );
  });

  it('never includes internal_cost_limit_usd or raw USD cost in the response returned to the client', async () => {
    const deps = makeDeps();
    const gateway = makeGateway(deps);

    const result = await gateway.chat(context, 'hola');

    expect(JSON.stringify(result)).not.toContain('internal_cost_limit_usd');
    expect(JSON.stringify(result)).not.toContain('costUsd');
  });

  it('routes an AI_FREE company to Gemini and never touches OpenAI, even though OpenAI is configured', async () => {
    const deps = makeDeps();
    deps.subscriptions.requireEnabled.mockResolvedValue({
      plan_code: 'AI_FREE',
    });
    deps.geminiProvider.complete.mockResolvedValue(
      stopResult({ model: 'gemini-3.6-flash', content: 'hola desde gemini' }),
    );
    const gateway = makeGateway(deps);

    const result = await gateway.chat(context, 'hola');

    expect(deps.geminiProvider.complete).toHaveBeenCalledTimes(1);
    expect(deps.provider.complete).not.toHaveBeenCalled();
    expect(result.reply).toBe('hola desde gemini');
    expect(deps.usage.record).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
      }),
    );
  });

  it("does not fall back to Gemini when the paying-plan company's OpenAI call fails — this is what broke before the fix (every chat used to hard-fail while OPENAI_API_KEY had no funded credit)", async () => {
    const deps = makeDeps();
    deps.subscriptions.requireEnabled.mockResolvedValue({
      plan_code: 'AI_PRO',
    });
    deps.provider.complete.mockRejectedValue(new AiProviderError());
    const gateway = makeGateway(deps);

    await expect(gateway.chat(context, 'hola')).rejects.toBeInstanceOf(
      AiProviderError,
    );
    expect(deps.geminiProvider.complete).not.toHaveBeenCalled();
  });

  it('throws AI_PROVIDER_NOT_CONFIGURED for an AI_FREE company when GEMINI_API_KEY is missing, even though OpenAI is configured', async () => {
    const deps = makeDeps();
    deps.subscriptions.requireEnabled.mockResolvedValue({
      plan_code: 'AI_FREE',
    });
    deps.config.geminiConfigured = false;
    const gateway = makeGateway(deps);

    await expect(gateway.chat(context, 'hola')).rejects.toBeInstanceOf(
      AiProviderNotConfiguredError,
    );
    expect(deps.provider.complete).not.toHaveBeenCalled();
  });
});

describe('AiGatewayService.chat — tool-calling loop', () => {
  it('executes an authorized tool and feeds the result back to the model for the final answer', async () => {
    const tool = makeSearchProductsTool();
    const deps = makeDeps([tool]);
    deps.provider.complete
      .mockResolvedValueOnce(
        toolCallResult('search_products', { query: 'tornillo' }),
      )
      .mockResolvedValueOnce(stopResult({ content: 'Encontré 3 productos.' }));
    const gateway = makeGateway(deps);

    const result = await gateway.chat(context, '¿tenés tornillos?');

    expect(deps.provider.complete).toHaveBeenCalledTimes(2);
    expect(tool.handler).toHaveBeenCalledWith({ query: 'tornillo' }, context);
    expect(result.reply).toBe('Encontré 3 productos.');
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AI_TOOL_CALLED',
        result: 'SUCCESS',
      }),
    );
  });

  it('strips company_id/user_id from model-generated tool arguments before calling the handler (malicious/hallucinated argument ignored)', async () => {
    const tool = makeSearchProductsTool();
    const deps = makeDeps([tool]);
    deps.provider.complete
      .mockResolvedValueOnce(
        toolCallResult('search_products', {
          query: 'tornillo',
          company_id: 'attacker-company',
          companyId: 'attacker-company',
          user_id: 'attacker-user',
        }),
      )
      .mockResolvedValueOnce(stopResult());
    const gateway = makeGateway(deps);

    await gateway.chat(context, 'hola');

    expect(tool.handler).toHaveBeenCalledWith({ query: 'tornillo' }, context);
  });

  it('returns PERMISSION_DENIED to the model and audits AI_TOOL_PERMISSION_DENIED when the user lacks the tool permission', async () => {
    const tool = makeSearchProductsTool({ permission: 'sales.read' }); // context only has products.read
    const deps = makeDeps([tool]);
    deps.provider.complete
      .mockResolvedValueOnce(toolCallResult('search_products'))
      .mockResolvedValueOnce(
        stopResult({ content: 'No tenés permiso para ver eso.' }),
      );
    const gateway = makeGateway(deps);

    await gateway.chat(context, 'hola');

    expect(tool.handler).not.toHaveBeenCalled();
    expect(deps.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AI_TOOL_PERMISSION_DENIED',
        result: 'BLOCKED',
      }),
    );
    const toolMessage =
      deps.provider.complete.mock.calls[1][0].messages.at(-1)!;
    expect(toolMessage.content).toEqual({ error: 'PERMISSION_DENIED' });
  });

  it('returns TOOL_NOT_FOUND to the model when it requests a tool that does not exist, without crashing', async () => {
    const deps = makeDeps([]); // no tools registered
    deps.provider.complete
      .mockResolvedValueOnce(toolCallResult('delete_everything'))
      .mockResolvedValueOnce(stopResult());
    const gateway = makeGateway(deps);

    const result = await gateway.chat(context, 'hola');

    const toolMessage =
      deps.provider.complete.mock.calls[1][0].messages.at(-1)!;
    expect(toolMessage.content).toEqual({ error: 'TOOL_NOT_FOUND' });
    expect(result.reply).toBe('respuesta final');
  });

  it('returns TOOL_TIMEOUT when a handler exceeds its timeout', async () => {
    const slowTool = makeSearchProductsTool({
      timeoutMs: 10,
      handler: jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 200)),
      ),
    });
    const deps = makeDeps([slowTool]);
    deps.provider.complete
      .mockResolvedValueOnce(toolCallResult('search_products'))
      .mockResolvedValueOnce(stopResult());
    const gateway = makeGateway(deps);

    await gateway.chat(context, 'hola');

    const toolMessage =
      deps.provider.complete.mock.calls[1][0].messages.at(-1)!;
    expect(toolMessage.content).toEqual({ error: 'TOOL_TIMEOUT' });
  });

  it('stops after AI_MAX_TOOL_ROUNDS model round-trips instead of looping forever', async () => {
    const tool = makeSearchProductsTool();
    const deps = makeDeps([tool]);
    deps.config.maxToolRounds = 3;
    // The model always wants another tool call — never converges on its own.
    deps.provider.complete.mockResolvedValue(toolCallResult('search_products'));
    const gateway = makeGateway(deps);

    const result = await gateway.chat(context, 'hola');

    expect(deps.provider.complete).toHaveBeenCalledTimes(3);
    expect(result.reply).toBeTruthy();
  });

  it('stops executing tools once AI_MAX_TOOL_CALLS_PER_REQUEST is reached within a single round', async () => {
    const tool = makeSearchProductsTool();
    const deps = makeDeps([tool]);
    deps.config.maxToolCallsPerRequest = 1;
    deps.provider.complete
      .mockResolvedValueOnce({
        model: 'gpt-5-mini',
        content: null,
        toolCalls: [
          { id: 'call_1', name: 'search_products', arguments: {} },
          { id: 'call_2', name: 'search_products', arguments: {} },
        ],
        finishReason: 'tool_calls',
        usage: {
          inputTokens: 10,
          cachedInputTokens: 0,
          outputTokens: 5,
          totalTokens: 15,
        },
      })
      .mockResolvedValueOnce(stopResult());
    const gateway = makeGateway(deps);

    await gateway.chat(context, 'hola');

    expect(tool.handler).toHaveBeenCalledTimes(1);
    const messages = deps.provider.complete.mock.calls[1][0].messages;
    expect(messages.at(-1)!.content).toEqual({
      error: 'TOOL_CALL_LIMIT_EXCEEDED',
    });
  });

  it('accumulates tokens and cost across every round and settles once with the total (not per round)', async () => {
    const tool = makeSearchProductsTool();
    const deps = makeDeps([tool]);
    deps.pricing.calculate.mockReturnValue(new Prisma.Decimal('0.001'));
    deps.credits.toCredits.mockReturnValue(new Prisma.Decimal('1'));
    deps.provider.complete
      .mockResolvedValueOnce(toolCallResult('search_products')) // usage: 40+10=50
      .mockResolvedValueOnce(stopResult()); // usage: 50+20=70
    const gateway = makeGateway(deps);

    await gateway.chat(context, 'hola');

    expect(deps.quota.settle).toHaveBeenCalledTimes(1);
    const [, , actual] = deps.quota.settle.mock.calls[0];
    expect(actual.costUsd.toString()).toBe('0.002'); // two rounds @ 0.001 each
    expect(actual.credits.toString()).toBe('2'); // two rounds @ 1 credit each
    const recordedUsage = deps.usage.record.mock.calls[0][0];
    expect(recordedUsage.totalTokens).toBe(50 + 70); // both rounds' usage, not just the last one
  });

  it('settles the real accumulated cost (not a plain release) when a later round fails after an earlier round already produced billable usage', async () => {
    const tool = makeSearchProductsTool();
    const deps = makeDeps([tool]);
    deps.provider.complete
      .mockResolvedValueOnce(toolCallResult('search_products')) // succeeds, real cost incurred
      .mockRejectedValueOnce(new Error('network blip')); // second round fails
    const gateway = makeGateway(deps);

    await expect(gateway.chat(context, 'hola')).rejects.toBeInstanceOf(
      AiProviderError,
    );

    expect(deps.quota.release).not.toHaveBeenCalled();
    expect(deps.quota.settle).toHaveBeenCalledTimes(1);
    const [, , actual] = deps.quota.settle.mock.calls[0];
    expect(actual.costUsd.isZero()).toBe(false);
  });
});

describe('AiGatewayService.extractProducts — Carga inteligente de stock', () => {
  function extractionResult(json: string, model = 'gemini-3.6-flash') {
    return stopResult({ model, content: json });
  }

  it('routes an AI_FREE company to Gemini, checks quota first, and settles on success', async () => {
    const deps = makeDeps();
    deps.subscriptions.requireEnabled.mockResolvedValue({
      plan_code: 'AI_FREE',
    });
    deps.geminiProvider.complete.mockResolvedValue(
      extractionResult('{"products":[{"name":"Remera Nike"}]}'),
    );
    const gateway = makeGateway(deps);

    const result = await gateway.extractProducts(context, {
      text: 'Remera Nike x1',
    });

    expect(deps.subscriptions.requireEnabled).toHaveBeenCalledWith('company-1');
    expect(deps.quota.reserve).toHaveBeenCalledTimes(1);
    expect(deps.geminiProvider.complete).toHaveBeenCalledTimes(1);
    expect(deps.provider.complete).not.toHaveBeenCalled(); // OpenAI never touched — free plan never sees it
    expect(deps.quota.settle).toHaveBeenCalledTimes(1);
    expect(result.products).toEqual([
      expect.objectContaining({ name: 'Remera Nike' }),
    ]);
    expect(result.provider).toBe('gemini');
    expect(deps.usage.record).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'stock_extraction',
        provider: 'gemini',
        status: 'SUCCESS',
      }),
    );
  });

  it('routes a paying-plan company to OpenAI and never touches Gemini', async () => {
    const deps = makeDeps();
    deps.subscriptions.requireEnabled.mockResolvedValue({
      plan_code: 'AI_PRO',
    });
    deps.provider.complete.mockResolvedValue(
      extractionResult('{"products":[{"name":"Pantalón"}]}', 'gpt-5-mini'),
    );
    const gateway = makeGateway(deps);

    const result = await gateway.extractProducts(context, { text: 'algo' });

    expect(deps.provider.complete).toHaveBeenCalledTimes(1);
    expect(deps.geminiProvider.complete).not.toHaveBeenCalled();
    expect(result.provider).toBe('openai');
  });

  it("never falls back to the other plan's provider on failure — an AI_FREE company just gets the error back", async () => {
    const deps = makeDeps();
    deps.subscriptions.requireEnabled.mockResolvedValue({
      plan_code: 'AI_FREE',
    });
    deps.geminiProvider.complete.mockRejectedValue(new AiProviderError());
    const gateway = makeGateway(deps);

    await expect(
      gateway.extractProducts(context, { text: 'algo' }),
    ).rejects.toBeInstanceOf(AiProviderError);
    expect(deps.geminiProvider.complete).toHaveBeenCalledTimes(1);
    expect(deps.provider.complete).not.toHaveBeenCalled(); // no cross-plan fallback
    expect(deps.quota.release).toHaveBeenCalledTimes(1);
    expect(deps.quota.settle).not.toHaveBeenCalled();
  });

  it('settles (not releases) when the response was malformed — the call was real and billed even though it was unusable', async () => {
    const deps = makeDeps();
    deps.subscriptions.requireEnabled.mockResolvedValue({
      plan_code: 'AI_FREE',
    });
    deps.geminiProvider.complete.mockResolvedValue(
      extractionResult('not json'),
    );
    const gateway = makeGateway(deps);

    await expect(
      gateway.extractProducts(context, { text: 'algo' }),
    ).rejects.toBeInstanceOf(AiInvalidResponseError);
    expect(deps.quota.settle).toHaveBeenCalledTimes(1);
    expect(deps.quota.release).not.toHaveBeenCalled();
  });

  it("throws AI_PROVIDER_NOT_CONFIGURED when the plan's assigned provider has no API key, without touching quota", async () => {
    const deps = makeDeps();
    deps.subscriptions.requireEnabled.mockResolvedValue({
      plan_code: 'AI_FREE',
    });
    deps.config.geminiConfigured = false;
    const gateway = makeGateway(deps);

    await expect(
      gateway.extractProducts(context, { text: 'algo' }),
    ).rejects.toBeInstanceOf(AiProviderNotConfiguredError);
    expect(deps.quota.reserve).not.toHaveBeenCalled();
    expect(deps.geminiProvider.complete).not.toHaveBeenCalled();
  });

  it('throws AI_DISABLED and never calls a provider when the company has no AI subscription', async () => {
    const deps = makeDeps();
    deps.subscriptions.requireEnabled.mockRejectedValue(new AiDisabledError());
    const gateway = makeGateway(deps);

    await expect(
      gateway.extractProducts(context, { text: 'algo' }),
    ).rejects.toBeInstanceOf(AiDisabledError);
    expect(deps.geminiProvider.complete).not.toHaveBeenCalled();
    expect(deps.provider.complete).not.toHaveBeenCalled();
  });

  it('reserves a larger estimate for an image than for text-only input', async () => {
    const deps = makeDeps();
    deps.subscriptions.requireEnabled.mockResolvedValue({
      plan_code: 'AI_FREE',
    });
    deps.geminiProvider.complete.mockResolvedValue(
      extractionResult('{"products":[]}'),
    );
    const gateway = makeGateway(deps);

    await gateway.extractProducts(context, {
      image: { mimeType: 'image/jpeg', dataBase64: 'ZmFrZQ==' },
    });

    expect(deps.pricing.estimateMax).toHaveBeenCalledTimes(1);
    const [{ estimatedInputTokens: withImage }] =
      deps.pricing.estimateMax.mock.calls[0];
    deps.pricing.estimateMax.mockClear();

    await gateway.extractProducts(context, { text: 'x' });
    const [{ estimatedInputTokens: textOnly }] =
      deps.pricing.estimateMax.mock.calls[0];

    expect(withImage).toBeGreaterThan(textOnly);
  });
});
