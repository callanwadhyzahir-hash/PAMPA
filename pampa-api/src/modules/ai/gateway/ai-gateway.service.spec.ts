import { Prisma } from '@prisma/client';

import type { SecurityAuditService } from '../../auth/audit/security-audit.service';
import type { RateLimitService } from '../../auth/rate-limit/rate-limit.service';
import type { SecurityContext } from '../../auth/types/security-context';
import type { AiConfigService } from '../ai.config';
import {
  AiCostLimitExceededError,
  AiDisabledError,
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
    rateLimitCompanyPerMinute: 20,
    rateLimitUserPerMinute: 6,
    maxToolRounds: 5,
    maxToolCallsPerRequest: 10,
    toolTimeoutMs: 8000,
    maxConversationContextMessages: 10,
  };

  const subscriptions = {
    requireEnabled: jest.fn().mockResolvedValue({}),
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
    estimateMax: jest.fn().mockReturnValue(new Prisma.Decimal('0.02')),
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
    deps.provider,
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
