import { Prisma } from '@prisma/client';

import type { AiConfigService } from '../ai.config';
import { AiCreditsService } from './ai-credits.service';

describe('AiCreditsService', () => {
  it('converts USD cost to credits using the configured credit value, not a fixed token ratio', () => {
    const config = {
      creditValueUsd: new Prisma.Decimal('0.001'),
    } as AiConfigService;
    const service = new AiCreditsService(config);

    const credits = service.toCredits(new Prisma.Decimal('0.5'));

    expect(credits.toString()).toBe('500');
  });

  it('changing the credit value changes the conversion without touching pricing', () => {
    const cheap = new AiCreditsService({
      creditValueUsd: new Prisma.Decimal('0.0001'),
    } as AiConfigService);
    const expensive = new AiCreditsService({
      creditValueUsd: new Prisma.Decimal('0.01'),
    } as AiConfigService);

    const cost = new Prisma.Decimal('0.01');

    expect(cheap.toCredits(cost).greaterThan(expensive.toCredits(cost))).toBe(
      true,
    );
  });
});
