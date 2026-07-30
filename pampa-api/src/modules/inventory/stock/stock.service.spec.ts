import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SecurityContext } from '../../auth/types/security-context';
import type { StockRepository } from './repositories/stock.repository';
import { StockService } from './stock.service';

const context: SecurityContext = {
  userId: 'user-a',
  companyId: 'company-a',
  branchId: null,
  sessionId: 'session-a',
  email: 'owner@example.com',
  roles: ['OWNER'],
  permissions: [],
};

describe('StockService', () => {
  const repository = {
    findAll: jest.fn(),
    summary: jest.fn(),
    findMovements: jest.fn(),
    findMovement: jest.fn(),
    transaction: jest.fn(),
    findActiveProduct: jest.fn(),
    findActiveWarehouse: jest.fn(),
    lockStock: jest.fn(),
    upsertStock: jest.fn(),
    updateQuantity: jest.fn(),
    createMovement: jest.fn(),
  };
  const service = new StockService(repository as unknown as StockRepository);
  const tx = {};

  beforeEach(() => {
    jest.clearAllMocks();
    repository.transaction.mockImplementation(
      (work: (transaction: unknown) => Promise<unknown>) => work(tx),
    );
    repository.findActiveProduct.mockResolvedValue({ id: 'product-a' });
    repository.findActiveWarehouse.mockResolvedValue({ id: 'warehouse-a' });
    repository.lockStock.mockResolvedValue(1);
    repository.upsertStock.mockResolvedValue({
      id: 'stock-a',
      quantity: new Prisma.Decimal(10),
    });
    repository.updateQuantity.mockResolvedValue({ id: 'stock-a' });
    repository.createMovement.mockResolvedValue({ id: 'movement-a' });
  });

  it('adds inbound adjustments and records one movement', async () => {
    await service.adjust(context, {
      productId: 'product-a',
      warehouseId: 'warehouse-a',
      movementType: 'ADJUSTMENT_IN',
      quantity: 2,
      reason: ' Conteo   físico ',
    });

    expect(repository.updateQuantity).toHaveBeenCalledWith(
      tx,
      'stock-a',
      new Prisma.Decimal(12),
    );
    expect(repository.createMovement).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        companyId: context.companyId,
        quantity: new Prisma.Decimal(2),
        observations: 'Conteo físico',
      }),
    );
  });

  it('rejects an outbound adjustment that would create negative stock', async () => {
    repository.upsertStock.mockResolvedValue({
      id: 'stock-a',
      quantity: new Prisma.Decimal(1),
    });

    await expect(
      service.adjust(context, {
        productId: 'product-a',
        warehouseId: 'warehouse-a',
        movementType: 'ADJUSTMENT_OUT',
        quantity: 2,
        reason: 'Merma',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.updateQuantity).not.toHaveBeenCalled();
  });

  it('rejects transfers to the same warehouse before opening a transaction', () => {
    expect(() =>
      service.transfer(context, {
        productId: 'product-a',
        sourceWarehouseId: 'warehouse-a',
        targetWarehouseId: 'warehouse-a',
        quantity: 1,
        reason: 'Traslado',
      }),
    ).toThrow(BadRequestException);
    expect(repository.transaction).not.toHaveBeenCalled();
  });

  it('creates atomic outbound and inbound transfer movements', async () => {
    repository.upsertStock
      .mockResolvedValueOnce({
        id: 'source-stock',
        quantity: new Prisma.Decimal(10),
      })
      .mockResolvedValueOnce({
        id: 'target-stock',
        quantity: new Prisma.Decimal(3),
      });

    await service.transfer(context, {
      productId: 'product-a',
      sourceWarehouseId: 'warehouse-a',
      targetWarehouseId: 'warehouse-b',
      quantity: 4,
      reason: 'Reposición',
    });

    expect(repository.updateQuantity).toHaveBeenCalledWith(
      tx,
      'source-stock',
      new Prisma.Decimal(6),
    );
    expect(repository.updateQuantity).toHaveBeenCalledWith(
      tx,
      'target-stock',
      new Prisma.Decimal(7),
    );
    const movements = repository.createMovement.mock.calls.map(
      (call: unknown[]) =>
        call[1] as { movementType: string; referenceCode: string },
    );
    expect(movements.map((movement) => movement.movementType)).toEqual([
      'TRANSFER_OUT',
      'TRANSFER_IN',
    ]);
    expect(movements[0].referenceCode).toBe(movements[1].referenceCode);
  });
});
