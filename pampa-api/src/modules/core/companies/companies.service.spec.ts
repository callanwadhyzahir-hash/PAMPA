import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import type { SecurityContext } from '../../auth/types/security-context';
import { CompaniesService } from './companies.service';
import { CompanyRepository } from './repositories/company.repository';

const companyA = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Empresa A',
  tax_id: '30111111118',
  is_active: true,
};
const companyB = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Empresa B',
  tax_id: '30222222226',
  is_active: true,
};
const contextA: SecurityContext = {
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  companyId: companyA.id,
  branchId: null,
  sessionId: 'session-a',
  tokenVersion: 1,
  email: 'user-a@example.com',
  roles: ['VIEWER'],
  permissions: ['companies.read'],
};
const contextB: SecurityContext = {
  ...contextA,
  userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  companyId: companyB.id,
  email: 'user-b@example.com',
};

describe('CompaniesService tenant isolation', () => {
  let service: CompaniesService;
  const repository = {
    findCurrent: jest.fn(),
    findByTaxIdExcludingId: jest.fn(),
    findCompanyTypeById: jest.fn(),
    findTaxConditionById: jest.fn(),
    findCurrencyById: jest.fn(),
    updateCurrent: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: CompanyRepository, useValue: repository },
      ],
    }).compile();

    service = module.get(CompaniesService);
  });

  it('uses only company A from its security context', async () => {
    repository.findCurrent.mockResolvedValue(companyA);

    await expect(service.findCurrent(contextA)).resolves.toEqual(companyA);
    expect(repository.findCurrent).toHaveBeenCalledWith(companyA.id);
    expect(repository.findCurrent).not.toHaveBeenCalledWith(companyB.id);
  });

  it('uses only company B from user B context', async () => {
    repository.findCurrent.mockResolvedValue(companyB);

    await expect(service.findCurrent(contextB)).resolves.toEqual(companyB);
    expect(repository.findCurrent).toHaveBeenCalledWith(companyB.id);
  });

  it('returns not found when the authenticated company is absent or inactive', async () => {
    repository.findCurrent.mockResolvedValue(null);

    await expect(service.findCurrent(contextA)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates only the company contained in the security context', async () => {
    const update = { name: 'Empresa A actualizada' };
    repository.updateCurrent.mockResolvedValue({ ...companyA, ...update });

    await expect(service.updateCurrent(contextA, update)).resolves.toEqual({
      ...companyA,
      ...update,
    });
    expect(repository.updateCurrent).toHaveBeenCalledWith(companyA.id, update);
    expect(repository.updateCurrent).not.toHaveBeenCalledWith(
      companyB.id,
      expect.anything(),
    );
  });

  it('does not modify company B while updating company A', async () => {
    const companyBSnapshot = { ...companyB };
    repository.updateCurrent.mockResolvedValue(companyA);

    await service.updateCurrent(contextA, { name: 'Empresa A segura' });

    expect(companyB).toEqual(companyBSnapshot);
  });

  it('rejects a duplicate tax id without changing tenant scope', async () => {
    repository.findByTaxIdExcludingId.mockResolvedValue({ id: companyB.id });

    await expect(
      service.updateCurrent(contextA, { taxId: companyB.tax_id }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.findByTaxIdExcludingId).toHaveBeenCalledWith(
      companyB.tax_id,
      companyA.id,
    );
    expect(repository.updateCurrent).not.toHaveBeenCalled();
  });
});
