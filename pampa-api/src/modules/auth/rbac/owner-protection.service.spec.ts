import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { OwnerProtectionService } from './owner-protection.service';
import type { RbacRepository } from './rbac.repository';

describe('OwnerProtectionService', () => {
  const tx = {
    user_role: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
  };
  const repository = {
    executeOwnerMutation: jest.fn(
      (_companyId: string, operation: (client: typeof tx) => unknown) =>
        operation(tx),
    ),
  };
  const service = new OwnerProtectionService(
    repository as unknown as RbacRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    tx.user_role.findFirst
      .mockResolvedValueOnce({ user_id: 'actor' })
      .mockResolvedValueOnce({ user_id: 'another-owner' });
    tx.user.findFirst.mockResolvedValue({
      id: 'target',
      is_active: true,
    });
    tx.role.findUnique.mockResolvedValue({ id: 'owner-role' });
    tx.user_role.findUnique.mockResolvedValue({ user_id: 'target' });
    tx.user_role.delete.mockResolvedValue({});
    tx.user.update.mockResolvedValue({ id: 'target' });
  });

  it('removes OWNER when another active OWNER exists', async () => {
    await expect(
      service.removeOwner('actor', 'target', 'company-a'),
    ).resolves.toBe(true);
    expect(repository.executeOwnerMutation).toHaveBeenCalledWith(
      'company-a',
      expect.any(Function),
    );
    expect(tx.user_role.delete).toHaveBeenCalled();
  });

  it('blocks removing the last active OWNER', async () => {
    tx.user_role.findFirst
      .mockReset()
      .mockResolvedValueOnce({ user_id: 'actor' })
      .mockResolvedValueOnce(null);

    await expect(
      service.removeOwner('actor', 'target', 'company-a'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.user_role.delete).not.toHaveBeenCalled();
  });

  it('applies the same last-OWNER rule before deactivation', async () => {
    tx.user_role.findFirst
      .mockReset()
      .mockResolvedValueOnce({ user_id: 'actor' })
      .mockResolvedValueOnce(null);

    await expect(
      service.deactivateUser('actor', 'target', 'company-a'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('rejects a non-OWNER actor', async () => {
    tx.user_role.findFirst.mockReset().mockResolvedValueOnce(null);

    await expect(
      service.removeOwner('actor', 'target', 'company-a'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects OWNER self-removal even when another OWNER exists', async () => {
    await expect(
      service.removeOwner('actor', 'actor', 'company-a'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.user_role.delete).not.toHaveBeenCalled();
  });

  it('rejects OWNER self-deactivation', async () => {
    await expect(
      service.deactivateUser('actor', 'actor', 'company-a'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('does not reveal whether a cross-tenant target exists', async () => {
    tx.user.findFirst.mockResolvedValue(null);

    await expect(
      service.removeOwner('actor', 'foreign-user', 'company-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign-user', company_id: 'company-a' },
      select: { id: true, is_active: true },
    });
  });

  it('is idempotent when the target does not have OWNER', async () => {
    tx.user_role.findUnique.mockResolvedValue(null);

    await expect(
      service.removeOwner('actor', 'target', 'company-a'),
    ).resolves.toBe(false);
    expect(tx.user_role.delete).not.toHaveBeenCalled();
  });
});
