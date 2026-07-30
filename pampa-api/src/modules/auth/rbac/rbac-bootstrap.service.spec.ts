import { ConflictException, NotFoundException } from '@nestjs/common';

import {
  ROLE_PERMISSION_MATRIX,
  SYSTEM_ROLES,
  TENANT_PERMISSIONS,
} from './rbac.definitions';
import { RbacBootstrapService } from './rbac-bootstrap.service';
import type { RbacRepository } from './rbac.repository';

describe('RbacBootstrapService', () => {
  const repository = {
    bootstrap: jest.fn(),
    assignOwnerByEmail: jest.fn(),
  };
  const service = new RbacBootstrapService(
    repository as unknown as RbacRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it('uses the typed catalog and exact matrix for every execution', async () => {
    repository.bootstrap.mockResolvedValue({
      permissionsSynchronized: 48,
      activeCompanies: 2,
      systemRolesSynchronized: 16,
      rolePermissionSetsSynchronized: 16,
    });

    await service.bootstrap();
    await service.bootstrap();

    expect(repository.bootstrap).toHaveBeenCalledTimes(2);
    expect(repository.bootstrap).toHaveBeenLastCalledWith({
      permissions: TENANT_PERMISSIONS,
      roles: SYSTEM_ROLES,
      matrix: ROLE_PERMISSION_MATRIX,
    });
  });

  it('normalizes email and reports an idempotent OWNER assignment', async () => {
    repository.assignOwnerByEmail.mockResolvedValue({
      status: 'ASSIGNED',
      alreadyAssigned: true,
      userName: 'Test User',
      companyName: 'Tenant A',
    });

    await expect(
      service.assignInitialOwnerByEmail('  USER@EXAMPLE.COM '),
    ).resolves.toEqual({
      userName: 'Test User',
      companyName: 'Tenant A',
      roleCode: 'OWNER',
      alreadyAssigned: true,
    });
    expect(repository.assignOwnerByEmail).toHaveBeenCalledWith(
      'user@example.com',
    );
  });

  it.each([
    ['USER_NOT_FOUND', NotFoundException],
    ['USER_INACTIVE', ConflictException],
    ['COMPANY_INACTIVE', ConflictException],
    ['OWNER_ROLE_UNAVAILABLE', ConflictException],
  ] as const)('maps %s to a safe domain error', async (status, exception) => {
    repository.assignOwnerByEmail.mockResolvedValue({ status });

    await expect(
      service.assignInitialOwnerByEmail('user@example.com'),
    ).rejects.toBeInstanceOf(exception);
  });
});
