import type { PrismaService } from '../../../database/prisma.service';
import { MockFiscalProviderService } from './mock-fiscal-provider.service';

function buildService(prismaOverrides: {
  findMany?: jest.Mock;
  findFirst?: jest.Mock;
}) {
  const prisma = {
    invoice: {
      findMany: prismaOverrides.findMany ?? jest.fn().mockResolvedValue([]),
      findFirst: prismaOverrides.findFirst ?? jest.fn().mockResolvedValue(null),
    },
  };
  return new MockFiscalProviderService(prisma as unknown as PrismaService);
}

const baseQuery = {
  companyId: 'company-1',
  environment: 'HOMOLOGACION' as const,
  pointOfSale: '0000',
  voucherTypeCode: '11',
};

describe('MockFiscalProviderService', () => {
  it('never contacts a real endpoint and computes the next correlative from prior MOCK invoices', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([{ invoice_number: '5' }, { invoice_number: '7' }]);
    const service = buildService({ findMany });

    const last = await service.getLastAuthorizedVoucherNumber(baseQuery);

    expect(last).toBe(7);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ fiscal_provider: 'MOCK' }),
      }),
    );
  });

  it('returns 0 when there are no prior approved MOCK invoices', async () => {
    const service = buildService({});
    expect(await service.getLastAuthorizedVoucherNumber(baseQuery)).toBe(0);
  });

  it('approves by default with a clearly-fake CAE', async () => {
    const service = buildService({});

    const result = await service.requestCae({
      ...baseQuery,
      invoiceId: 'invoice-1',
      voucherNumber: 8,
      itemsSnapshot: [],
      totalsSnapshot: { subtotal: '100.00', total: '100.00' },
      clientSnapshot: null,
    });

    expect(result.status).toBe('APPROVED');
    expect(result.provider).toBe('MOCK');
    expect(result.cae).toMatch(/^00SIMULADO\d{4}$/);
    expect(result.cae).toHaveLength(14);
    expect(result.caeExpiration).toBeInstanceOf(Date);
  });

  it('rejects in a controlled way when forceOutcome is REJECTED', async () => {
    const service = buildService({});

    const result = await service.requestCae({
      ...baseQuery,
      invoiceId: 'invoice-1',
      voucherNumber: 8,
      itemsSnapshot: [],
      totalsSnapshot: { subtotal: '100.00', total: '100.00' },
      clientSnapshot: null,
      forceOutcome: 'REJECTED',
    });

    expect(result.status).toBe('REJECTED');
    expect(result.cae).toBeUndefined();
    expect(result.errorCode).toBe('MOCK-REJECTED');
  });

  it('getExistingVoucher returns the already-approved MOCK invoice (idempotency)', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      cae: '00SIMULADO1234',
      cae_expiration: new Date('2026-08-20'),
    });
    const service = buildService({ findFirst });

    const result = await service.getExistingVoucher({
      ...baseQuery,
      voucherNumber: 8,
    });

    expect(result?.status).toBe('APPROVED');
    expect(result?.provider).toBe('MOCK');
    expect(result?.cae).toBe('00SIMULADO1234');
  });

  it('getExistingVoucher returns null when no matching approved invoice exists', async () => {
    const service = buildService({});
    const result = await service.getExistingVoucher({
      ...baseQuery,
      voucherNumber: 8,
    });
    expect(result).toBeNull();
  });
});
