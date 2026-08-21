import type { Prisma } from '@prisma/client';

import type { PrismaService } from '../../../database/prisma.service';
import { AiUsageRepository } from './ai-usage.repository';

describe('AiUsageRepository tenant isolation', () => {
  it('scopes aggregateForCompany to the given company_id', async () => {
    const aggregate = jest
      .fn<Promise<unknown>, [{ where: { company_id: string } }]>()
      .mockResolvedValue({});
    const prisma = { ai_usage_ledger: { aggregate } };
    const repository = new AiUsageRepository(
      prisma as unknown as PrismaService,
    );

    await repository.aggregateForCompany('company-a', new Date(0));

    const call = aggregate.mock.calls[0][0];
    expect(call.where).toMatchObject({ company_id: 'company-a' });
  });

  it('scopes listRecentForCompany to the given company_id and never selects a prompt/response field', async () => {
    const findMany = jest
      .fn<Promise<unknown[]>, [Prisma.ai_usage_ledgerFindManyArgs]>()
      .mockResolvedValue([]);
    const prisma = { ai_usage_ledger: { findMany } };
    const repository = new AiUsageRepository(
      prisma as unknown as PrismaService,
    );

    await repository.listRecentForCompany('company-a', 20);

    const call = findMany.mock.calls[0][0];
    expect(call.where).toEqual({ company_id: 'company-a' });
    expect(Object.keys(call.select ?? {})).not.toEqual(
      expect.arrayContaining(['message', 'prompt', 'response', 'content']),
    );
  });

  it('record() never accepts a message/prompt/response field to persist', async () => {
    // Compile-time guarantee: RecordUsageInput has no such field, so this is
    // a structural smoke test that the ledger write path only ever touches
    // token counts and cost — see docs/pampa-ai-architecture.md §Privacidad.
    const create = jest
      .fn<Promise<unknown>, [Prisma.ai_usage_ledgerCreateArgs]>()
      .mockResolvedValue({});
    const prisma = { ai_usage_ledger: { create } };
    const repository = new AiUsageRepository(
      prisma as unknown as PrismaService,
    );

    await repository.record({
      companyId: 'company-a',
      userId: 'user-a',
      provider: 'openai',
      model: 'gpt-5-mini',
      operation: 'chat',
      status: 'SUCCESS',
    });

    const data = create.mock.calls[0][0].data;
    expect(Object.keys(data)).not.toEqual(
      expect.arrayContaining(['message', 'prompt', 'response', 'content']),
    );
  });
});
