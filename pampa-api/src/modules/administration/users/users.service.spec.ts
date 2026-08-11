import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import type { OwnerProtectionService } from '../../auth/rbac/owner-protection.service';
import type { UserRoleAssignmentService } from '../../auth/rbac/user-role-assignment.service';
import type { SecurityContext } from '../../auth/types/security-context';
import type { UserRepository } from './repositories/user.repository';
import { UsersService } from './users.service';

const context: SecurityContext = {
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  companyId: '11111111-1111-4111-8111-111111111111',
  branchId: null,
  sessionId: 'session-actor',
  tokenVersion: 1,
  email: 'actor@example.com',
  roles: ['OWNER'],
  permissions: [],
  isPlatformAdmin: false,
};
const targetId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const user = {
  id: targetId,
  first_name: 'Target',
  last_name: 'User',
  email: 'target@example.com',
  phone: null,
  branch_id: null,
  is_active: true,
  last_login_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  branch: null,
  user_role: [],
};

describe('UsersService', () => {
  const repository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findActiveBranch: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const ownerProtection = {
    deactivateUser: jest.fn(),
  };
  const roleAssignment = {
    replaceRoles: jest.fn(),
  };
  const service = new UsersService(
    repository as unknown as UserRepository,
    ownerProtection as unknown as OwnerProtectionService,
    roleAssignment as unknown as UserRoleAssignmentService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findById.mockResolvedValue(user);
    repository.findByEmail.mockResolvedValue(null);
    repository.findActiveBranch.mockResolvedValue({ id: 'branch' });
    repository.create.mockResolvedValue(user);
    repository.update.mockResolvedValue(user);
    ownerProtection.deactivateUser.mockResolvedValue(undefined);
    roleAssignment.replaceRoles.mockResolvedValue(undefined);
  });

  it('always lists users using the authenticated company', async () => {
    repository.findAll.mockResolvedValue([user]);

    await expect(service.findAll(context)).resolves.toEqual([user]);
    expect(repository.findAll).toHaveBeenCalledWith(context.companyId);
  });

  it('returns 404 for a user outside the tenant', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne(context, targetId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findById).toHaveBeenCalledWith(
      context.companyId,
      targetId,
    );
  });

  it('creates a user without passing a plaintext password to persistence', async () => {
    let persisted: { passwordHash: string } | undefined;
    repository.create.mockImplementation(
      (_companyId: string, input: { passwordHash: string }) => {
        persisted = input;
        return Promise.resolve(user);
      },
    );

    await service.create(context, {
      firstName: '  Target ',
      lastName: ' User ',
      email: 'target@example.com',
      temporaryPassword: 'Strong!Password1',
      phone: ' 123 ',
    });

    expect(repository.create).toHaveBeenCalledWith(
      context.companyId,
      expect.objectContaining({
        firstName: 'Target',
        lastName: 'User',
        email: 'target@example.com',
        phone: '123',
      }),
    );
    expect(persisted?.passwordHash).not.toContain('Strong!Password1');
  });

  it('rejects a duplicated email', async () => {
    repository.findByEmail.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create(context, {
        firstName: 'Target',
        lastName: 'User',
        email: 'target@example.com',
        temporaryPassword: 'Strong!Password1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects a branch outside the tenant', async () => {
    repository.findActiveBranch.mockResolvedValue(null);

    await expect(
      service.create(context, {
        firstName: 'Target',
        lastName: 'User',
        email: 'target@example.com',
        temporaryPassword: 'Strong!Password1',
        branchId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('routes deactivation through OWNER protection', async () => {
    await service.deactivate(context, targetId);

    expect(ownerProtection.deactivateUser).toHaveBeenCalledWith(
      context.userId,
      targetId,
      context.companyId,
    );
  });

  it('blocks self-deactivation', async () => {
    await expect(
      service.deactivate(context, context.userId),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(ownerProtection.deactivateUser).not.toHaveBeenCalled();
  });

  it('blocks self-role changes', async () => {
    await expect(
      service.replaceRoles(context, context.userId, { roleIds: [] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(roleAssignment.replaceRoles).not.toHaveBeenCalled();
  });

  it('delegates role replacement with trusted tenant context', async () => {
    const roleIds = ['dddddddd-dddd-4ddd-8ddd-dddddddddddd'];

    await service.replaceRoles(context, targetId, { roleIds });

    expect(roleAssignment.replaceRoles).toHaveBeenCalledWith({
      actorUserId: context.userId,
      actorCompanyId: context.companyId,
      targetUserId: targetId,
      roleIds,
    });
  });
});
