import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { EmailVerificationNotifierService } from '../../auth/email-verification/email-verification-notifier.service';
import { EmailVerificationRepository } from '../../auth/email-verification/email-verification.repository';
import { EmailVerificationService } from '../../auth/email-verification/email-verification.service';
import type { SecurityAuditService } from '../../auth/audit/security-audit.service';
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
  const emailVerification = {
    sendVerification: jest.fn(),
  };
  const service = new UsersService(
    repository as unknown as UserRepository,
    ownerProtection as unknown as OwnerProtectionService,
    roleAssignment as unknown as UserRoleAssignmentService,
    emailVerification as unknown as EmailVerificationService,
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

  it('leaves the new user unverified and requests email verification, same as self-registration', async () => {
    let persisted: { email_verified_at?: unknown } | undefined;
    repository.create.mockImplementation(
      (_companyId: string, input: unknown) => {
        persisted = input as { email_verified_at?: unknown };
        return Promise.resolve(user);
      },
    );

    await service.create(context, {
      firstName: 'Target',
      lastName: 'User',
      email: 'target@example.com',
      temporaryPassword: 'Strong!Password1',
    });

    // UserRepository.create() never sets email_verified_at, so it keeps the
    // Prisma default (null) — the same gate AuthService.login() checks.
    expect(persisted).not.toHaveProperty('email_verified_at');
    expect(emailVerification.sendVerification).toHaveBeenCalledWith({
      userId: user.id,
      companyId: context.companyId,
      email: user.email,
      firstName: user.first_name,
    });
  });

  it('does not undo the already-created user when Resend fails to deliver the verification email', async () => {
    const notifier = { sendVerification: jest.fn() };
    const audit = { record: jest.fn() };
    // Uses the real EmailVerificationService (not a mock), same as
    // registration.service.spec.ts — proves a Resend rejection is caught
    // inside sendVerification() and never bubbles up to UsersService.create().
    const realEmailVerification = new EmailVerificationService(
      {
        createToken: jest.fn().mockResolvedValue({ id: 'token-id' }),
      } as unknown as EmailVerificationRepository,
      notifier as unknown as EmailVerificationNotifierService,
      audit as unknown as SecurityAuditService,
    );
    notifier.sendVerification.mockRejectedValue(
      new Error('Resend unavailable'),
    );
    const serviceWithRealNotifier = new UsersService(
      repository as unknown as UserRepository,
      ownerProtection as unknown as OwnerProtectionService,
      roleAssignment as unknown as UserRoleAssignmentService,
      realEmailVerification,
    );

    const result = await serviceWithRealNotifier.create(context, {
      firstName: 'Target',
      lastName: 'User',
      email: 'target@example.com',
      temporaryPassword: 'Strong!Password1',
    });

    expect(result).toEqual(user);
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'EMAIL_VERIFICATION_DELIVERY_FAILED',
      }),
    );
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
    expect(emailVerification.sendVerification).not.toHaveBeenCalled();
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
