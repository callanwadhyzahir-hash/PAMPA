import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SecurityContext } from '../../auth/types/security-context';
import type { ProductRepository } from './repositories/product.repository';
import { ProductsService } from './products.service';

const context: SecurityContext = {
  userId: 'user-a',
  companyId: 'company-a',
  branchId: null,
  sessionId: 'session-a',
  tokenVersion: 1,
  email: 'owner@example.com',
  roles: ['OWNER'],
  permissions: [],
};

const product = {
  id: 'product-a',
  category_id: 'category-a',
  code: 'SKU-1',
  barcode: '779000000001',
  name: 'Taladro',
  description: null,
  product_type: 'PRODUCT',
  unit: 'UNIT',
  cost: new Prisma.Decimal(100),
  sale_price: new Prisma.Decimal(150),
  tax_rate: new Prisma.Decimal(21),
  tracks_stock: true,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  product_category: {
    id: 'category-a',
    name: 'Herramientas',
    is_active: true,
  },
  company: {
    currency: { id: 'ars', code: 'ARS', name: 'Peso', symbol: '$' },
  },
  stock: [
    {
      id: 'stock-a',
      warehouse_id: 'warehouse-a',
      quantity: new Prisma.Decimal(3),
      minimum_quantity: new Prisma.Decimal(5),
      maximum_quantity: null,
      warehouse: {
        id: 'warehouse-a',
        name: 'Central',
        code: 'CENTRAL',
        is_active: true,
      },
    },
  ],
};

describe('ProductsService', () => {
  const repository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByBarcode: jest.fn(),
    findByCodeOrBarcode: jest.fn(),
    findActiveCategory: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    findStock: jest.fn(),
    findMovements: jest.fn(),
  };
  const service = new ProductsService(
    repository as unknown as ProductRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findById.mockResolvedValue(product);
    repository.findByCodeOrBarcode.mockResolvedValue(null);
    repository.findActiveCategory.mockResolvedValue({ id: 'category-a' });
    repository.create.mockResolvedValue(product);
    repository.update.mockResolvedValue(product);
    repository.deactivate.mockResolvedValue(product);
  });

  it('lists only the authenticated tenant and returns pagination', async () => {
    repository.findAll.mockResolvedValue({ items: [product], total: 1 });

    const result = await service.findAll(context, {
      search: ' taladro ',
      page: 1,
      limit: 20,
    });

    expect(repository.findAll).toHaveBeenCalledWith(context.companyId, {
      search: 'taladro',
      categoryId: undefined,
      isActive: undefined,
      page: 1,
      limit: 20,
    });
    expect(result.pagination.total).toBe(1);
    expect(result.items[0].low_stock).toBe(true);
  });

  it('returns neutral 404 for a foreign product', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne(context, 'foreign')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('normalizes SKU and uses backend monetary values', async () => {
    await service.create(context, {
      code: ' sku-1 ',
      name: ' Taladro ',
      categoryId: 'category-a',
      cost: 100,
      salePrice: 150,
    });

    expect(repository.create).toHaveBeenCalledWith(
      context.companyId,
      expect.objectContaining({
        code: 'SKU-1',
        name: 'Taladro',
        cost: new Prisma.Decimal(100),
        salePrice: new Prisma.Decimal(150),
      }),
    );
  });

  it('rejects categories outside the tenant', async () => {
    repository.findActiveCategory.mockResolvedValue(null);

    await expect(
      service.create(context, {
        code: 'SKU-1',
        name: 'Taladro',
        categoryId: 'foreign',
        cost: 100,
        salePrice: 150,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects duplicate SKU or barcode inside the tenant', async () => {
    repository.findByCodeOrBarcode.mockResolvedValue({
      id: 'existing',
      code: 'SKU-1',
      barcode: null,
    });

    await expect(
      service.create(context, {
        code: 'sku-1',
        name: 'Taladro',
        cost: 100,
        salePrice: 150,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
