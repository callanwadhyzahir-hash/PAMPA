import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SecurityContext } from '../../auth/types/security-context';
import { ClientsService } from './clients.service';
import type { ClientRepository } from './repositories/client.repository';

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

const client = {
  id: 'client-a',
  code: 'CLI-1',
  first_name: 'Ana',
  last_name: 'Pérez',
  business_name: null,
  tax_id: '20123456789',
  email: 'ana@example.com',
  phone: null,
  mobile: null,
  is_company: false,
  credit_limit: new Prisma.Decimal(0),
  current_balance: new Prisma.Decimal(0),
  notes: null,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  address: null,
  _count: { sale: 0 },
};

describe('ClientsService', () => {
  const repository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCodeOrTaxId: jest.fn(),
    findAddress: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    sales: jest.fn(),
  };
  const service = new ClientsService(repository as unknown as ClientRepository);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findById.mockResolvedValue(client);
    repository.findByCodeOrTaxId.mockResolvedValue(null);
    repository.create.mockResolvedValue(client);
    repository.update.mockResolvedValue(client);
    repository.deactivate.mockResolvedValue(client);
    repository.sales.mockResolvedValue([]);
  });

  it('scopes client lists to the authenticated tenant', async () => {
    repository.findAll.mockResolvedValue([client]);

    await service.findAll(context, ' ana ');

    expect(repository.findAll).toHaveBeenCalledWith(
      context.companyId,
      'ana',
      undefined,
    );
  });

  it('returns neutral 404 for another tenant client', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne(context, 'foreign')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('normalizes document, email and code', async () => {
    await service.create(context, {
      code: ' cli-1 ',
      firstName: ' Ana ',
      taxId: '20-12345678-9',
      email: ' ANA@EXAMPLE.COM ',
      isCompany: false,
    });

    expect(repository.create).toHaveBeenCalledWith(
      context.companyId,
      expect.objectContaining({
        code: 'CLI-1',
        first_name: 'Ana',
        tax_id: '20123456789',
        email: 'ana@example.com',
      }),
    );
  });

  it('rejects duplicate document or code inside a tenant', async () => {
    repository.findByCodeOrTaxId.mockResolvedValue({
      id: 'existing',
      code: 'CLI-1',
      tax_id: null,
    });

    await expect(
      service.create(context, {
        code: 'cli-1',
        firstName: 'Ana',
        isCompany: false,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('derives account balance from non-cancelled sales and payments', async () => {
    repository.sales.mockResolvedValue([
      {
        id: 'sale-a',
        sale_number: BigInt(1),
        sale_date: new Date(),
        total: new Prisma.Decimal(100),
        status: 'COMPLETED',
        branch: { id: 'branch-a', name: 'Central', code: 'CEN' },
        payment: [
          {
            id: 'payment-a',
            total: new Prisma.Decimal(40),
            payment_date: new Date(),
            status: 'COMPLETED',
          },
          {
            id: 'payment-refunded',
            total: new Prisma.Decimal(25),
            payment_date: new Date(),
            status: 'REFUNDED',
          },
        ],
      },
    ]);

    const account = await service.account(context, client.id);

    expect(account.salesTotal).toEqual(new Prisma.Decimal(100));
    expect(account.paidTotal).toEqual(new Prisma.Decimal(40));
    expect(account.balance).toEqual(new Prisma.Decimal(60));
  });
});
