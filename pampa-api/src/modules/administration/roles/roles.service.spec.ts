import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import type { SystemRolePolicyService } from '../../auth/rbac/system-role-policy.service';
import type { SecurityContext } from '../../auth/types/security-context';
import type { RoleRepository } from './repositories/role.repository';
import { RolesService } from './roles.service';

const context: SecurityContext = {
  userId: 'actor',
  companyId: 'company-a',
  branchId: null,
  sessionId: 'session-actor',
  tokenVersion: 1,
  email: 'actor@example.com',
  roles: ['ADMINISTRATOR'],
  permissions: [],
  isPlatformAdmin: false,
};
const customRole = {
  id: 'role-a',
  name: 'Operador personalizado',
  description: null,
  system_code: null,
  is_system: false,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  role_permission: [],
  _count: { user_role: 0 },
};

describe('RolesService', () => {
  const repository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    actorIsOwner: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findApprovedPermissions: jest.fn(),
    replacePermissions: jest.fn(),
  };
  const policy = {
    assertCustomRoleCanBeMutated: jest.fn(),
  };
  const service = new RolesService(
    repository as unknown as RoleRepository,
    policy as unknown as SystemRolePolicyService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findById.mockResolvedValue(customRole);
    repository.findByName.mockResolvedValue(null);
    repository.create.mockResolvedValue(customRole);
    repository.update.mockResolvedValue(customRole);
    repository.actorIsOwner.mockResolvedValue(null);
    repository.replacePermissions.mockResolvedValue({ status: 'UPDATED' });
  });

  it('lists roles only for the authenticated company', async () => {
    repository.findAll.mockResolvedValue([customRole]);

    await service.findAll(context);

    expect(repository.findAll).toHaveBeenCalledWith(context.companyId);
  });

  it('returns neutral 404 for a foreign role', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne(context, 'foreign')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates a custom role with a normalized visible name', async () => {
    await service.create(context, {
      name: '  Operador personalizado ',
      description: '  Operación diaria ',
    });

    expect(repository.create).toHaveBeenCalledWith(context.companyId, {
      name: 'Operador personalizado',
      description: 'Operación diaria',
    });
  });

  it.each(['OWNER', 'Propietario', 'administrátor', 'VIEWER'])(
    'rejects the reserved or ambiguous name %s',
    async (name) => {
      await expect(service.create(context, { name })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    },
  );

  it('delegates system-role immutability to the shared policy', async () => {
    repository.findById.mockResolvedValue({
      ...customRole,
      system_code: 'OWNER',
      is_system: true,
    });
    policy.assertCustomRoleCanBeMutated.mockImplementation(() => {
      throw new ForbiddenException();
    });

    await expect(
      service.update(context, customRole.id, { name: 'Renamed' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    ['NOT_FOUND', NotFoundException],
    ['SYSTEM_ROLE', ForbiddenException],
    ['ASSIGNED', ConflictException],
  ] as const)('maps delete status %s safely', async (status, error) => {
    repository.delete.mockResolvedValue({ status });

    await expect(service.delete(context, customRole.id)).rejects.toBeInstanceOf(
      error,
    );
  });

  it('allows deleting an unassigned custom role', async () => {
    repository.delete.mockResolvedValue({ status: 'DELETED' });

    await expect(
      service.delete(context, customRole.id),
    ).resolves.toBeUndefined();
  });

  it('only requests permissions from the approved tenant catalog', async () => {
    let requestedCodes: readonly string[] = [];
    repository.findApprovedPermissions.mockImplementation(
      (codes: readonly string[]) => {
        requestedCodes = codes;
        return Promise.resolve([]);
      },
    );

    await service.findPermissions();

    expect(requestedCodes).not.toContain('platform.admin');
  });

  it('prepares reserved-permission enforcement using DB-backed OWNER status', async () => {
    repository.actorIsOwner.mockResolvedValue(null);
    repository.replacePermissions.mockResolvedValue({
      status: 'RESERVED_PERMISSION',
    });

    await expect(
      service.replacePermissions(context, customRole.id, {
        permissionIds: ['permission-a'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.replacePermissions).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: context.companyId,
        roleId: customRole.id,
        actorIsOwner: false,
        reservedCodes: expect.arrayContaining([
          'users.assign_roles',
          'roles.assign_permissions',
        ]) as unknown,
      }),
    );
  });

  it.each([
    ['ROLE_NOT_FOUND', NotFoundException],
    ['SYSTEM_ROLE', ForbiddenException],
    ['PERMISSION_NOT_FOUND', NotFoundException],
  ] as const)('maps permission status %s safely', async (status, error) => {
    repository.replacePermissions.mockResolvedValue({ status });

    await expect(
      service.replacePermissions(context, customRole.id, {
        permissionIds: [],
      }),
    ).rejects.toBeInstanceOf(error);
  });
});
