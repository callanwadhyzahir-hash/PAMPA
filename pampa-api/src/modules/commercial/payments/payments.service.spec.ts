import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SecurityContext } from '../../auth/types/security-context';
import type { StockRepository } from '../../inventory/stock/repositories/stock.repository';
import { PaymentsService } from './payments.service';
import type { PaymentRepository } from './repositories/payment.repository';

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

describe('PaymentsService', () => {
  const tx = {};
  const repository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdTx: jest.fn(),
    lockSale: jest.fn(),
    findSale: jest.fn(),
    create: jest.fn(),
    updateSaleStatus: jest.fn(),
    recalculateClientBalance: jest.fn(),
    cancel: jest.fn(),
  };
  const stock = { transaction: jest.fn() };
  const service = new PaymentsService(
    repository as unknown as PaymentRepository,
    stock as unknown as StockRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    stock.transaction.mockImplementation(
      (work: (client: unknown) => Promise<unknown>) => work(tx),
    );
    repository.findSale.mockResolvedValue({
      id: 'sale-a',
      client_id: 'client-a',
      total: new Prisma.Decimal(100),
      status: 'CONFIRMED',
      payment: [],
    });
    repository.create.mockResolvedValue({ id: 'payment-a' });
  });

  it('registers a partial payment and updates the sale balance status', async () => {
    await service.create(context, 'sale-a', {
      items: [{ method: 'CASH', amount: 40 }],
    });
    expect(repository.create).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ total: new Prisma.Decimal(40) }),
    );
    expect(repository.updateSaleStatus).toHaveBeenCalledWith(
      tx,
      'sale-a',
      'PARTIALLY_PAID',
    );
  });

  it('marks the sale paid when accumulated payments equal its total', async () => {
    repository.findSale.mockResolvedValue({
      id: 'sale-a',
      client_id: 'client-a',
      total: new Prisma.Decimal(100),
      status: 'PARTIALLY_PAID',
      payment: [{ id: 'payment-old', total: new Prisma.Decimal(40) }],
    });
    await service.create(context, 'sale-a', {
      items: [{ method: 'BANK_TRANSFER', amount: 60 }],
    });
    expect(repository.updateSaleStatus).toHaveBeenCalledWith(
      tx,
      'sale-a',
      'PAID',
    );
  });

  it('rejects overpayment after locking and recalculating the current balance', async () => {
    await expect(
      service.create(context, 'sale-a', {
        items: [{ method: 'CASH', amount: 100.01 }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('returns 404 for a sale from another tenant', async () => {
    repository.findSale.mockResolvedValue(null);
    await expect(
      service.create(context, 'foreign-sale', {
        items: [{ method: 'CASH', amount: 10 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reverses a payment and restores the sale payment status', async () => {
    repository.findByIdTx.mockResolvedValue({
      id: 'payment-a',
      sale_id: 'sale-a',
    });
    repository.findSale.mockResolvedValue({
      id: 'sale-a',
      client_id: 'client-a',
      total: new Prisma.Decimal(100),
      status: 'PARTIALLY_PAID',
      payment: [{ id: 'payment-a', total: new Prisma.Decimal(40) }],
    });
    repository.cancel.mockResolvedValue({
      id: 'payment-a',
      status: 'REFUNDED',
    });

    await service.reverse(
      context,
      'payment-a',
      { reason: ' Solicitud   del cliente ' },
      'REFUNDED',
    );
    expect(repository.cancel).toHaveBeenCalledWith(
      tx,
      'payment-a',
      'REFUNDED',
      'Solicitud del cliente',
    );
    expect(repository.updateSaleStatus).toHaveBeenCalledWith(
      tx,
      'sale-a',
      'CONFIRMED',
    );
  });
});
