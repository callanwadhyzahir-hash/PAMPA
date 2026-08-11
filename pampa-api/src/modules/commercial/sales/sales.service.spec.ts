import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SecurityContext } from '../../auth/types/security-context';
import type { StockRepository } from '../../inventory/stock/repositories/stock.repository';
import type { SaleRepository } from './repositories/sale.repository';
import { SalesService } from './sales.service';

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

describe('SalesService', () => {
  const tx = {};
  const repository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdTx: jest.fn(),
    findResources: jest.fn(),
    findProducts: jest.fn(),
    create: jest.fn(),
    confirm: jest.fn(),
    companySnapshot: jest.fn(),
    createInvoice: jest.fn(),
    cancel: jest.fn(),
  };
  const stock = {
    transaction: jest.fn(),
    lockStock: jest.fn(),
    upsertStock: jest.fn(),
    updateQuantity: jest.fn(),
    createMovement: jest.fn(),
  };
  const service = new SalesService(
    repository as unknown as SaleRepository,
    stock as unknown as StockRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    stock.transaction.mockImplementation(
      (work: (client: unknown) => Promise<unknown>) => work(tx),
    );
    repository.findResources.mockResolvedValue([
      { id: 'branch-a' },
      { id: 'warehouse-a' },
      { id: 'client-a' },
    ]);
    repository.findProducts.mockResolvedValue([
      {
        id: 'product-a',
        code: 'P-1',
        name: 'Producto',
        sale_price: new Prisma.Decimal(100),
        tax_rate: new Prisma.Decimal(21),
        tracks_stock: true,
      },
    ]);
  });

  it('calculates price, discount and tax only from backend product data', async () => {
    repository.create.mockResolvedValue({ id: 'sale-a' });
    await service.create(context, {
      branchId: 'branch-a',
      warehouseId: 'warehouse-a',
      clientId: 'client-a',
      items: [{ productId: 'product-a', quantity: 2, discountPercent: 10 }],
    });

    expect(repository.create).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        companyId: context.companyId,
        subtotal: new Prisma.Decimal(180),
        discountTotal: new Prisma.Decimal(20),
        taxTotal: new Prisma.Decimal(37.8),
        total: new Prisma.Decimal(217.8),
      }),
    );
  });

  it('blocks creating a sale against a branch owned by another company and never persists it', async () => {
    // findResources runs company-scoped Prisma lookups (WHERE company_id = :companyId);
    // a branch that belongs to another tenant resolves to null exactly like this.
    repository.findResources.mockResolvedValue([
      null,
      { id: 'warehouse-a' },
      { id: 'client-a' },
    ]);
    await expect(
      service.create(context, {
        branchId: 'branch-from-company-b',
        warehouseId: 'warehouse-a',
        clientId: 'client-a',
        items: [{ productId: 'product-a', quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('returns 404 when a product belongs to another tenant', async () => {
    repository.findProducts.mockResolvedValue([]);
    await expect(
      service.create(context, {
        branchId: 'branch-a',
        warehouseId: 'warehouse-a',
        items: [{ productId: 'foreign-product', quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects products without a positive sale price', async () => {
    repository.findProducts.mockResolvedValue([
      {
        id: 'product-a',
        code: 'P-1',
        name: 'Producto sin precio',
        sale_price: new Prisma.Decimal(0),
        tax_rate: new Prisma.Decimal(21),
        tracks_stock: true,
      },
    ]);

    await expect(
      service.create(context, {
        branchId: 'branch-a',
        warehouseId: 'warehouse-a',
        items: [{ productId: 'product-a', quantity: 1 }],
      }),
    ).rejects.toThrow(
      'Producto sin precio no tiene un precio de venta válido.',
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects a second confirmation without touching stock', async () => {
    repository.findByIdTx.mockResolvedValue({ status: 'CONFIRMED' });
    await expect(service.confirm(context, 'sale-a')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(stock.lockStock).not.toHaveBeenCalled();
  });

  it('rejects confirmation when stock would become negative', async () => {
    repository.findByIdTx.mockResolvedValue({
      id: 'sale-a',
      status: 'DRAFT',
      branch_id: 'branch-a',
      warehouse_id: 'warehouse-a',
      client_id: 'client-a',
      sale_number: BigInt(1),
      client: null,
      sale_item: [
        {
          id: 'item-a',
          product_id: 'product-a',
          quantity: new Prisma.Decimal(2),
          discount_percent: new Prisma.Decimal(0),
        },
      ],
    });
    stock.upsertStock.mockResolvedValue({
      id: 'stock-a',
      quantity: new Prisma.Decimal(1),
    });

    await expect(service.confirm(context, 'sale-a')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(stock.updateQuantity).not.toHaveBeenCalled();
    expect(repository.confirm).not.toHaveBeenCalled();
  });
});
