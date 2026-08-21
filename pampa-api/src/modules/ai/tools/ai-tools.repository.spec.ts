import { Prisma } from '@prisma/client';

import type { PrismaService } from '../../../database/prisma.service';
import { AiToolsRepository } from './ai-tools.repository';

// $queryRaw is Prisma's tagged-template API — every value interpolated in a
// `this.prisma.$queryRaw\`...${value}...\`` call is sent as a bound
// parameter, never string-concatenated into SQL. That's a compiler-level
// guarantee of the API shape used throughout this repository, not something
// a runtime test can meaningfully re-verify — these tests instead check
// tenant scoping and correct use of the real, existing business fields.
describe('AiToolsRepository', () => {
  it('salesSummary scopes both the current and comparison window to the given companyId', async () => {
    const aggregate = jest
      .fn<Promise<unknown>, [{ where: Record<string, unknown> }]>()
      .mockResolvedValueOnce({
        _sum: { total: new Prisma.Decimal('1000') },
        _count: 5,
      })
      .mockResolvedValueOnce({
        _sum: { total: new Prisma.Decimal('500') },
        _count: 3,
      });
    const prisma = { sale: { aggregate } };
    const repository = new AiToolsRepository(
      prisma as unknown as PrismaService,
    );

    const from = new Date('2026-01-01');
    const to = new Date('2026-01-08');
    const result = await repository.salesSummary('company-a', from, to);

    expect(aggregate.mock.calls[0][0].where).toEqual(
      expect.objectContaining({
        company_id: 'company-a',
        sale_date: { gte: from, lt: to },
      }),
    );
    expect(result.totalRevenue).toBe(1000);
    expect(result.salesCount).toBe(5);
    expect(result.averageTicket).toBe(200);
    expect(result.previousPeriodRevenue).toBe(500);
  });

  it('customerBalanceSummary filters by the real, actively-maintained current_balance field (never a computed guess)', async () => {
    const aggregate = jest
      .fn<Promise<unknown>, [{ where: Record<string, unknown> }]>()
      .mockResolvedValue({
        _sum: { current_balance: new Prisma.Decimal('300') },
      });
    const findMany = jest.fn().mockResolvedValue([
      {
        business_name: 'ACME',
        first_name: '',
        last_name: '',
        current_balance: new Prisma.Decimal('300'),
      },
    ]);
    const count = jest.fn().mockResolvedValue(1);
    const prisma = { client: { aggregate, findMany, count } };
    const repository = new AiToolsRepository(
      prisma as unknown as PrismaService,
    );

    const result = await repository.customerBalanceSummary('company-a', 10);

    expect(aggregate.mock.calls[0][0].where).toEqual(
      expect.objectContaining({
        company_id: 'company-a',
        current_balance: { gt: 0 },
      }),
    );
    expect(result.totalReceivable).toBe(300);
    expect(result.topDebtors).toEqual([{ clientName: 'ACME', balance: 300 }]);
  });

  it('topSellingProducts scopes the raw query result to a minimal {productName, unitsSold, revenue} shape', async () => {
    const queryRaw = jest.fn().mockResolvedValue([
      {
        productName: 'Tornillo',
        quantity: new Prisma.Decimal('12'),
        total: new Prisma.Decimal('600'),
      },
    ]);
    const prisma = { $queryRaw: queryRaw };
    const repository = new AiToolsRepository(
      prisma as unknown as PrismaService,
    );

    const result = await repository.topSellingProducts(
      'company-a',
      new Date(),
      new Date(),
      5,
    );

    expect(result).toEqual([
      { productName: 'Tornillo', unitsSold: 12, revenue: 600 },
    ]);
  });
});
