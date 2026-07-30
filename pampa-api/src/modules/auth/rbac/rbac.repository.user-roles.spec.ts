import type { PrismaService } from '../../../database/prisma.service';
import { RbacRepository } from './rbac.repository';

function createFixture(options?: {
  actorIsOwner?: boolean;
  roles?: { id: string; system_code: string | null }[];
  currentOwner?: boolean;
  anotherOwner?: boolean;
}) {
  const roles = options?.roles ?? [{ id: 'role-a', system_code: null }];
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    user: {
      update: jest.fn().mockResolvedValue({ id: 'target' }),
      findFirst: jest
        .fn()
        .mockResolvedValueOnce({
          user_role: options?.actorIsOwner
            ? [{ role: { system_code: 'OWNER' } }]
            : [{ role: { system_code: 'ADMINISTRATOR' } }],
        })
        .mockResolvedValueOnce({ id: 'target', is_active: true }),
    },
    role: {
      findMany: jest.fn().mockResolvedValue(roles),
      findUnique: jest.fn().mockResolvedValue({ id: 'owner-role' }),
    },
    user_role: {
      findUnique: jest
        .fn()
        .mockResolvedValue(
          options?.currentOwner ? { user_id: 'target' } : null,
        ),
      findFirst: jest
        .fn()
        .mockResolvedValue(options?.anotherOwner ? { user_id: 'other' } : null),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      createMany: jest.fn().mockResolvedValue({ count: roles.length }),
    },
  };
  const prisma = {
    $transaction: jest.fn(
      (operation: (client: typeof tx) => Promise<unknown>) => operation(tx),
    ),
  };
  return {
    tx,
    repository: new RbacRepository(prisma as unknown as PrismaService),
  };
}

describe('RbacRepository.replaceUserRoles', () => {
  const input = {
    actorUserId: 'actor',
    companyId: 'company-a',
    targetUserId: 'target',
    roleIds: ['role-a'],
  };

  it('rejects a role that is not active in the actor tenant', async () => {
    const { repository, tx } = createFixture({ roles: [] });

    await expect(repository.replaceUserRoles(input)).resolves.toEqual({
      status: 'ROLE_NOT_FOUND',
    });
    expect(tx.user_role.deleteMany).not.toHaveBeenCalled();
  });

  it('prevents ADMINISTRATOR from assigning OWNER', async () => {
    const { repository, tx } = createFixture({
      roles: [{ id: 'role-a', system_code: 'OWNER' }],
    });

    await expect(repository.replaceUserRoles(input)).resolves.toEqual({
      status: 'OWNER_REQUIRES_OWNER',
    });
    expect(tx.user_role.deleteMany).not.toHaveBeenCalled();
  });

  it('allows OWNER to assign OWNER', async () => {
    const { repository, tx } = createFixture({
      actorIsOwner: true,
      roles: [{ id: 'role-a', system_code: 'OWNER' }],
    });

    await expect(repository.replaceUserRoles(input)).resolves.toEqual({
      status: 'UPDATED',
    });
    expect(tx.user_role.createMany).toHaveBeenCalled();
  });

  it('protects the final active OWNER', async () => {
    const { repository, tx } = createFixture({
      actorIsOwner: true,
      currentOwner: true,
      anotherOwner: false,
    });

    await expect(repository.replaceUserRoles(input)).resolves.toEqual({
      status: 'LAST_OWNER',
    });
    expect(tx.user_role.deleteMany).not.toHaveBeenCalled();
  });

  it('allows another OWNER to remove OWNER when one remains', async () => {
    const { repository, tx } = createFixture({
      actorIsOwner: true,
      currentOwner: true,
      anotherOwner: true,
    });

    await expect(repository.replaceUserRoles(input)).resolves.toEqual({
      status: 'UPDATED',
    });
    expect(tx.user_role.deleteMany).toHaveBeenCalled();
  });
});
