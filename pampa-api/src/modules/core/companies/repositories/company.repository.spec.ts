import { PrismaService } from '../../../../database/prisma.service';
import { CompanyRepository } from './company.repository';

describe('CompanyRepository tenant scoping', () => {
  const prisma = {
    company: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    company_type: { findUnique: jest.fn() },
    tax_condition: { findUnique: jest.fn() },
    currency: { findUnique: jest.fn() },
  };
  const repository = new CompanyRepository(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('includes authenticated company id and active state in reads', async () => {
    const companyId = '11111111-1111-4111-8111-111111111111';
    prisma.company.findFirst.mockResolvedValue({ id: companyId });

    await repository.findCurrent(companyId);

    expect(prisma.company.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: companyId, is_active: true },
      }),
    );
  });

  it('includes authenticated company id and active state in updates', async () => {
    const companyId = '11111111-1111-4111-8111-111111111111';
    prisma.company.updateMany.mockResolvedValue({ count: 1 });
    prisma.company.findFirst.mockResolvedValue({ id: companyId });

    await repository.updateCurrent(companyId, { name: 'Empresa segura' });

    expect(prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: companyId, is_active: true },
      data: { name: 'Empresa segura' },
    });
  });

  it('returns null when the authenticated company cannot be updated', async () => {
    prisma.company.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.updateCurrent('11111111-1111-4111-8111-111111111111', {
        name: 'No disponible',
      }),
    ).resolves.toBeNull();
    expect(prisma.company.findFirst).not.toHaveBeenCalled();
  });
});
