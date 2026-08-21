import type { SecurityContext } from '../../../auth/types/security-context';
import type { AiToolsRepository } from '../ai-tools.repository';
import { createSalesSummaryTool } from './sales-summary.tool';

const context: SecurityContext = {
  userId: 'user-1',
  companyId: 'company-1',
  branchId: null,
  sessionId: 'session-1',
  tokenVersion: 0,
  email: 'a@a.com',
  roles: [],
  permissions: ['sales.read'],
  isPlatformAdmin: false,
};

describe('createSalesSummaryTool', () => {
  it('resolves the requested period and scopes the query to context.companyId, ignoring any companyId in args', async () => {
    const salesSummary = jest.fn().mockResolvedValue({
      totalRevenue: 1000,
      salesCount: 5,
      averageTicket: 200,
      previousPeriodRevenue: 800,
      previousPeriodSalesCount: 4,
    });
    const tool = createSalesSummaryTool({
      salesSummary,
    } as unknown as AiToolsRepository);

    const result = (await tool.handler(
      { period: 'last_7_days', companyId: 'attacker-company' },
      context,
    )) as { period: string; totalRevenue: number };

    expect(salesSummary).toHaveBeenCalledWith(
      'company-1',
      expect.any(Date),
      expect.any(Date),
    );
    expect(result.totalRevenue).toBe(1000);
    expect(result.period).toBe('últimos 7 días');
  });

  it('returns a structured INVALID_PERIOD result instead of throwing for a bad custom range', async () => {
    const salesSummary = jest.fn();
    const tool = createSalesSummaryTool({
      salesSummary,
    } as unknown as AiToolsRepository);

    const result = (await tool.handler({ period: 'custom' }, context)) as {
      error?: string;
    };

    expect(result.error).toBe('INVALID_PERIOD');
    expect(salesSummary).not.toHaveBeenCalled();
  });

  it('declares readOnly and the sales.read permission', () => {
    const tool = createSalesSummaryTool({} as AiToolsRepository);
    expect(tool.readOnly).toBe(true);
    expect(tool.permission).toBe('sales.read');
  });
});
