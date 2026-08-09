import { Test, TestingModule } from '@nestjs/testing';

import type { SecurityContext } from '../../auth/types/security-context';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

const securityContext: SecurityContext = {
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  companyId: '11111111-1111-4111-8111-111111111111',
  branchId: null,
  sessionId: 'session-a',
  tokenVersion: 1,
  email: 'user-a@example.com',
  roles: ['VIEWER'],
  permissions: ['companies.read'],
};

describe('CompaniesController', () => {
  let controller: CompaniesController;
  const service = {
    findCurrent: jest.fn(),
    updateCurrent: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [{ provide: CompaniesService, useValue: service }],
    }).compile();

    controller = module.get(CompaniesController);
  });

  it('delegates current company lookup with the trusted context', async () => {
    const company = { id: securityContext.companyId, name: 'Empresa A' };
    service.findCurrent.mockResolvedValue(company);

    await expect(controller.findCurrent(securityContext)).resolves.toEqual(
      company,
    );
    expect(service.findCurrent).toHaveBeenCalledWith(securityContext);
  });

  it('delegates updates without accepting a company id parameter', async () => {
    const update = { name: 'Empresa A actualizada' };
    service.updateCurrent.mockResolvedValue({
      id: securityContext.companyId,
      ...update,
    });

    await controller.updateCurrent(securityContext, update);

    expect(service.updateCurrent).toHaveBeenCalledWith(securityContext, update);
  });
});
