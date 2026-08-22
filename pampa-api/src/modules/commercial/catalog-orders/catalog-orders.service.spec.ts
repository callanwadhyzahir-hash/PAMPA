import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SecurityContext } from '../../auth/types/security-context';
import type { StockRepository } from '../../inventory/stock/repositories/stock.repository';
import type { ClientRepository } from '../clients/repositories/client.repository';
import type { SalesService } from '../sales/sales.service';
import { CatalogOrdersService } from './catalog-orders.service';
import type { CatalogOrderRepository } from './repositories/catalog-order.repository';

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

describe('CatalogOrdersService', () => {
  const tx = {};
  const repository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdTx: jest.fn(),
    claimForAccept: jest.fn(),
    linkAcceptedSale: jest.fn(),
    claimForReject: jest.fn(),
  };
  const clientRepository = {
    findByPhoneOrEmailTx: jest.fn(),
    createTx: jest.fn(),
  };
  const salesService = { createTx: jest.fn() };
  const stock = { transaction: jest.fn() };

  const service = new CatalogOrdersService(
    repository as unknown as CatalogOrderRepository,
    clientRepository as unknown as ClientRepository,
    salesService as unknown as SalesService,
    stock as unknown as StockRepository,
  );

  const pendingOrder = {
    id: 'order-a',
    order_number: BigInt(7),
    status: 'PENDING',
    customer_name: 'Juan Pérez',
    customer_phone: '+5491100000000',
    customer_email: null,
    catalog: {
      id: 'catalog-a',
      branch_id: 'branch-a',
      warehouse_id: 'warehouse-a',
    },
    catalog_order_item: [
      {
        product_id: 'product-a',
        quantity: new Prisma.Decimal(2),
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    stock.transaction.mockImplementation(
      (work: (client: unknown) => Promise<unknown>) => work(tx),
    );
  });

  it('never creates a sale when the order was already processed (double-accept race)', async () => {
    repository.claimForAccept.mockResolvedValue(false);
    repository.findByIdTx.mockResolvedValue({
      ...pendingOrder,
      status: 'ACCEPTED',
    });

    await expect(service.accept(context, 'order-a')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(salesService.createTx).not.toHaveBeenCalled();
    expect(repository.linkAcceptedSale).not.toHaveBeenCalled();
  });

  it('404s accepting an order that does not exist in this company', async () => {
    repository.claimForAccept.mockResolvedValue(false);
    repository.findByIdTx.mockResolvedValue(null);

    await expect(service.accept(context, 'order-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(salesService.createTx).not.toHaveBeenCalled();
  });

  it('reuses an existing client matched by phone instead of creating a duplicate', async () => {
    repository.claimForAccept.mockResolvedValue(true);
    repository.findByIdTx.mockResolvedValue(pendingOrder);
    clientRepository.findByPhoneOrEmailTx.mockResolvedValue({
      id: 'client-existing',
    });
    salesService.createTx.mockResolvedValue({ id: 'sale-a' });

    await service.accept(context, 'order-a');

    expect(clientRepository.createTx).not.toHaveBeenCalled();
    expect(salesService.createTx).toHaveBeenCalledWith(
      tx,
      context,
      expect.objectContaining({
        branchId: 'branch-a',
        warehouseId: 'warehouse-a',
        clientId: 'client-existing',
      }),
    );
    expect(repository.linkAcceptedSale).toHaveBeenCalledWith(tx, 'order-a', {
      clientId: 'client-existing',
      saleId: 'sale-a',
    });
  });

  it('creates a client only when none matches by phone or email', async () => {
    repository.claimForAccept.mockResolvedValue(true);
    repository.findByIdTx.mockResolvedValue(pendingOrder);
    clientRepository.findByPhoneOrEmailTx.mockResolvedValue(null);
    clientRepository.createTx.mockResolvedValue({ id: 'client-new' });
    salesService.createTx.mockResolvedValue({ id: 'sale-a' });

    await service.accept(context, 'order-a');

    expect(clientRepository.createTx).toHaveBeenCalledTimes(1);
    expect(salesService.createTx).toHaveBeenCalledWith(
      tx,
      context,
      expect.objectContaining({ clientId: 'client-new' }),
    );
  });

  it('rejecting an already-processed order is a conflict, not a silent no-op', async () => {
    repository.claimForReject.mockResolvedValue(false);
    repository.findByIdTx.mockResolvedValue({
      ...pendingOrder,
      status: 'ACCEPTED',
    });

    await expect(
      service.reject(context, 'order-a', { reason: 'Sin stock real' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
