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
  isPlatformAdmin: false,
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
    existsByBarcode: jest.fn(),
    findByCodeOrBarcode: jest.fn(),
    findDuplicateCandidates: jest.fn(),
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
    repository.existsByBarcode.mockResolvedValue(false);
  });

  describe('generateBarcode', () => {
    it('generates a barcode starting with the PMP internal namespace', async () => {
      const result = await service.generateBarcode(context);

      expect(result.barcode).toMatch(/^PMP-[A-Z0-9]{12}$/);
    });

    it('checks uniqueness scoped to the caller company', async () => {
      await service.generateBarcode(context);

      expect(repository.existsByBarcode).toHaveBeenCalledWith(
        context.companyId,
        expect.stringMatching(/^PMP-/),
      );
    });

    it('retries on collision and returns the first free candidate', async () => {
      repository.existsByBarcode
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await service.generateBarcode(context);

      expect(repository.existsByBarcode).toHaveBeenCalledTimes(3);
      expect(result.barcode).toMatch(/^PMP-[A-Z0-9]{12}$/);
    });

    it('gives up after exhausting attempts instead of returning a colliding code', async () => {
      repository.existsByBarcode.mockResolvedValue(true);

      await expect(service.generateBarcode(context)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('never generates two identical candidates across repeated calls', async () => {
      const results = await Promise.all(
        Array.from({ length: 20 }, () => service.generateBarcode(context)),
      );

      const unique = new Set(results.map((result) => result.barcode));
      expect(unique.size).toBe(results.length);
    });
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

  it('resolves an existing product by its exact barcode', async () => {
    repository.findByBarcode.mockResolvedValue(product);

    const result = await service.findByBarcode(context, ' 779000000001 ');

    expect(repository.findByBarcode).toHaveBeenCalledWith(
      context.companyId,
      '779000000001',
    );
    expect(result.id).toBe('product-a');
  });

  it('throws 404 for a barcode with no match in the tenant, never returning a product', async () => {
    repository.findByBarcode.mockResolvedValue(null);

    await expect(
      service.findByBarcode(context, 'unknown-barcode'),
    ).rejects.toBeInstanceOf(NotFoundException);
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

  describe('generateCodeFromName — Carga inteligente de stock', () => {
    it('derives an uppercase, accent-stripped code from the product name', async () => {
      const code = await service.generateCodeFromName(context, 'Remera Ñañá');
      expect(code).toBe('REMERA-NANA');
    });

    it('appends a numeric suffix when the base code is already taken', async () => {
      repository.findByCodeOrBarcode
        .mockResolvedValueOnce({ id: 'x', code: 'REMERA', barcode: null })
        .mockResolvedValueOnce(null);

      const code = await service.generateCodeFromName(context, 'Remera');

      expect(code).toBe('REMERA-2');
    });

    it('throws when every candidate up to the attempt limit is already taken', async () => {
      repository.findByCodeOrBarcode.mockResolvedValue({
        id: 'x',
        code: 'X',
        barcode: null,
      });

      await expect(
        service.generateCodeFromName(context, 'Remera'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findDuplicateCandidates — Carga inteligente de stock', () => {
    it('delegates to the repository scoped by the authenticated company', async () => {
      repository.findDuplicateCandidates.mockResolvedValue([]);

      await service.findDuplicateCandidates(context, {
        barcodes: ['779001'],
        names: ['Remera'],
      });

      expect(repository.findDuplicateCandidates).toHaveBeenCalledWith(
        'company-a',
        ['779001'],
        ['Remera'],
      );
    });
  });
});
