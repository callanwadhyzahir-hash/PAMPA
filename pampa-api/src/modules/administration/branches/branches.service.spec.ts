import { ConflictException, NotFoundException } from '@nestjs/common';

import type { SecurityContext } from '../../auth/types/security-context';
import type { BranchRepository } from './repositories/branch.repository';
import { BranchesService } from './branches.service';

const context: SecurityContext = {
  userId: 'actor',
  companyId: 'company-a',
  branchId: null,
  sessionId: 'session-actor',
  tokenVersion: 1,
  email: 'actor@example.com',
  roles: ['OWNER'],
  permissions: [],
};
const branch = {
  id: 'branch-a',
  name: 'Casa central',
  code: 'CENTRAL',
  email: null,
  phone: null,
  is_main: true,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  address: {},
  _count: { user: 0, warehouse: 0, sale: 0 },
};
const createInput = {
  name: ' Casa central ',
  code: ' central ',
  isMain: true,
  address: {
    cityId: 'city-a',
    street: ' Principal ',
    number: ' 100 ',
  },
};

describe('BranchesService', () => {
  const repository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    findActiveCity: jest.fn(),
    findActiveMain: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };
  const service = new BranchesService(
    repository as unknown as BranchRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findById.mockResolvedValue(branch);
    repository.findByCode.mockResolvedValue(null);
    repository.findActiveCity.mockResolvedValue({ id: 'city-a' });
    repository.findActiveMain.mockResolvedValue(null);
    repository.create.mockResolvedValue(branch);
    repository.update.mockResolvedValue(branch);
    repository.deactivate.mockResolvedValue({ status: 'DEACTIVATED' });
  });

  it('lists branches using only the authenticated company', async () => {
    repository.findAll.mockResolvedValue([branch]);

    await service.findAll(context);

    expect(repository.findAll).toHaveBeenCalledWith(context.companyId);
  });

  it('returns neutral 404 for a foreign branch', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne(context, 'foreign')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates a normalized branch and owned address', async () => {
    await service.create(context, createInput);

    expect(repository.create).toHaveBeenCalledWith(context.companyId, {
      name: 'Casa central',
      code: 'CENTRAL',
      email: undefined,
      phone: undefined,
      isMain: true,
      address: {
        cityId: 'city-a',
        street: 'Principal',
        number: '100',
        floor: undefined,
        apartment: undefined,
        neighborhood: undefined,
        zipCode: undefined,
        observations: undefined,
      },
    });
  });

  it('rejects duplicate code inside the tenant', async () => {
    repository.findByCode.mockResolvedValue({ id: 'existing' });

    await expect(service.create(context, createInput)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('allows the same code when the repository finds none for this tenant', async () => {
    await expect(service.create(context, createInput)).resolves.toEqual(branch);
  });

  it('rejects an inactive or missing city', async () => {
    repository.findActiveCity.mockResolvedValue(null);

    await expect(service.create(context, createInput)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a second active main branch', async () => {
    repository.findActiveMain.mockResolvedValue({ id: 'other-main' });

    await expect(service.create(context, createInput)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('blocks demoting the current main branch directly', async () => {
    await expect(
      service.update(context, branch.id, { isMain: false }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('promotes another branch through the repository transaction', async () => {
    repository.findById.mockResolvedValue({ ...branch, is_main: false });

    await service.update(context, branch.id, { isMain: true });

    expect(repository.update).toHaveBeenCalledWith(
      context.companyId,
      branch.id,
      expect.objectContaining({ isMain: true }),
    );
  });

  it('maps last-main deactivation to a conflict', async () => {
    repository.deactivate.mockResolvedValue({ status: 'LAST_MAIN' });

    await expect(service.deactivate(context, branch.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('soft-deactivates through a tenant-scoped repository', async () => {
    await service.deactivate(context, branch.id);

    expect(repository.deactivate).toHaveBeenCalledWith(
      context.companyId,
      branch.id,
    );
  });
});
