import { Prisma } from '@prisma/client';

import type { SecurityContext } from '../../../auth/types/security-context';
import type { ProductsService } from '../../../catalog/products/products.service';
import { createSearchProductsTool } from './search-products.tool';

const context: SecurityContext = {
  userId: 'user-1',
  companyId: 'company-1',
  branchId: null,
  sessionId: 'session-1',
  tokenVersion: 0,
  email: 'a@a.com',
  roles: [],
  permissions: ['products.read'],
  isPlatformAdmin: false,
};

function makeProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'internal-id-should-not-leak',
    company_id: context.companyId,
    code: 'SKU-1',
    name: 'Tornillo 3mm',
    barcode: '7791234567890',
    unit: 'UNIT',
    sale_price: new Prisma.Decimal('120.5'),
    total_stock: new Prisma.Decimal('40'),
    low_stock: false,
    is_active: true,
    ...overrides,
  };
}

describe('createSearchProductsTool', () => {
  it('declares readOnly and the products.read permission', () => {
    const tool = createSearchProductsTool({} as ProductsService);
    expect(tool.readOnly).toBe(true);
    expect(tool.permission).toBe('products.read');
  });

  it('delegates to ProductsService.findAll with the trusted context and returns a minimal shape (no internal id/company_id)', async () => {
    const findAll = jest.fn().mockResolvedValue({
      items: [makeProduct()],
      pagination: { page: 1, limit: 10, total: 1, pages: 1 },
    });
    const tool = createSearchProductsTool({
      findAll,
    } as unknown as ProductsService);

    const result = (await tool.handler({ query: 'tornillo' }, context)) as {
      totalMatches: number;
      products: Record<string, unknown>[];
    };

    expect(findAll).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ search: 'tornillo', isActive: true }),
    );
    expect(result.totalMatches).toBe(1);
    expect(result.products[0]).toEqual({
      sku: 'SKU-1',
      name: 'Tornillo 3mm',
      barcode: '7791234567890',
      unit: 'UNIT',
      salePrice: 120.5,
      totalStock: 40,
      lowStock: false,
      isActive: true,
    });
    expect(Object.keys(result.products[0])).not.toContain('id');
    expect(Object.keys(result.products[0])).not.toContain('company_id');
  });

  it('includes inactive products only when includeInactive=true', async () => {
    const findAll = jest.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, pages: 0 },
    });
    const tool = createSearchProductsTool({
      findAll,
    } as unknown as ProductsService);

    await tool.handler({ includeInactive: true }, context);

    expect(findAll).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ isActive: undefined }),
    );
  });
});
