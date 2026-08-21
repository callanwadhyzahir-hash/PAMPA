import { AiPricingService } from './ai-pricing.service';

describe('AiPricingService', () => {
  const service = new AiPricingService();

  it('bills non-cached input, cached input, and output at their configured per-million rates', () => {
    const cost = service.calculate({
      provider: 'openai',
      model: 'gpt-5-mini',
      inputTokens: 1_000_000,
      cachedInputTokens: 400_000,
      outputTokens: 1_000_000,
    });

    // billable input = 600,000 tokens @ $0.25/M = 0.15
    // cached input   = 400,000 tokens @ $0.025/M = 0.01
    // output         = 1,000,000 tokens @ $2.00/M = 2.00
    expect(cost.toFixed(8)).toBe('2.16000000');
  });

  it('never lets cachedInputTokens exceed inputTokens produce a negative billable amount', () => {
    const cost = service.calculate({
      provider: 'openai',
      model: 'gpt-5-mini',
      inputTokens: 100,
      cachedInputTokens: 500,
      outputTokens: 0,
    });

    expect(cost.greaterThanOrEqualTo(0)).toBe(true);
  });

  it('throws for an unconfigured provider/model pair instead of silently returning zero', () => {
    expect(() =>
      service.calculate({
        provider: 'openai',
        model: 'does-not-exist',
        inputTokens: 10,
        cachedInputTokens: 0,
        outputTokens: 10,
      }),
    ).toThrow();
  });

  it('estimateMax assumes zero cache hits and the full output-token cap (worst case for reservation)', () => {
    const exact = service.calculate({
      provider: 'openai',
      model: 'gpt-5-mini',
      inputTokens: 500,
      cachedInputTokens: 0,
      outputTokens: 700,
    });
    const estimate = service.estimateMax({
      provider: 'openai',
      model: 'gpt-5-mini',
      estimatedInputTokens: 500,
      maxOutputTokens: 700,
    });

    expect(estimate.toFixed(10)).toBe(exact.toFixed(10));
  });
});
