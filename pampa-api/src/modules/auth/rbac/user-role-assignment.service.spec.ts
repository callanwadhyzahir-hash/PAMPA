import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import type { RbacRepository } from './rbac.repository';
import { UserRoleAssignmentService } from './user-role-assignment.service';

describe('UserRoleAssignmentService', () => {
  const repository = {
    replaceUserRoles: jest.fn(),
  };
  const service = new UserRoleAssignmentService(
    repository as unknown as RbacRepository,
  );
  const input = {
    actorUserId: 'actor',
    actorCompanyId: 'company-a',
    targetUserId: 'target',
    roleIds: ['role-a'],
  };

  beforeEach(() => jest.clearAllMocks());

  it('completes a valid same-tenant replacement', async () => {
    repository.replaceUserRoles.mockResolvedValue({ status: 'UPDATED' });

    await expect(service.replaceRoles(input)).resolves.toBeUndefined();
    expect(repository.replaceUserRoles).toHaveBeenCalledWith({
      actorUserId: 'actor',
      companyId: 'company-a',
      targetUserId: 'target',
      roleIds: ['role-a'],
    });
  });

  it.each([
    ['ACTOR_NOT_FOUND', ForbiddenException],
    ['TARGET_NOT_FOUND', NotFoundException],
    ['ROLE_NOT_FOUND', NotFoundException],
    ['OWNER_ROLE_UNAVAILABLE', ConflictException],
    ['OWNER_REQUIRES_OWNER', ForbiddenException],
    ['LAST_OWNER', ConflictException],
  ] as const)('maps %s to the expected safe error', async (status, error) => {
    repository.replaceUserRoles.mockResolvedValue({ status });

    await expect(service.replaceRoles(input)).rejects.toBeInstanceOf(error);
  });
});
