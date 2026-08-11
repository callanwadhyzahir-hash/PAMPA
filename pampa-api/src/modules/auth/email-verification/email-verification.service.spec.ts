import { UnauthorizedException } from '@nestjs/common';

import { EmailVerificationNotifierService } from './email-verification-notifier.service';
import { EmailVerificationRepository } from './email-verification.repository';
import { EmailVerificationService } from './email-verification.service';
import { SecurityAuditService } from '../audit/security-audit.service';

describe('EmailVerificationService', () => {
  const repository = {
    findUnverifiedActiveUserByEmail: jest.fn(),
    createToken: jest.fn(),
    verifyToken: jest.fn(),
  };
  const notifier = { sendVerification: jest.fn() };
  const audit = { record: jest.fn() };
  const service = new EmailVerificationService(
    repository as unknown as EmailVerificationRepository,
    notifier as unknown as EmailVerificationNotifierService,
    audit as unknown as SecurityAuditService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('resend() creates a new token and sends it when the user is pending verification', async () => {
    repository.findUnverifiedActiveUserByEmail.mockResolvedValue({
      id: 'user-id',
      company_id: 'company-id',
      email: 'pending@example.com',
      first_name: 'Ana',
    });
    repository.createToken.mockResolvedValue({ id: 'token-id' });

    const result = await service.resend('pending@example.com');

    expect(repository.createToken).toHaveBeenCalledTimes(1);
    const [userId, tokenHash] = repository.createToken.mock.calls[0] as [
      string,
      string,
    ];
    expect(userId).toBe('user-id');
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(notifier.sendVerification).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'pending@example.com' }),
    );
    expect(result).toEqual({
      message:
        'Si existe una cuenta pendiente para ese correo, enviamos un nuevo enlace.',
    });
  });

  it('resend() returns the same neutral response without sending when there is no pending account', async () => {
    repository.findUnverifiedActiveUserByEmail.mockResolvedValue(null);

    const result = await service.resend('missing@example.com');

    expect(repository.createToken).not.toHaveBeenCalled();
    expect(notifier.sendVerification).not.toHaveBeenCalled();
    expect(result).toEqual({
      message:
        'Si existe una cuenta pendiente para ese correo, enviamos un nuevo enlace.',
    });
  });

  it('resend() also returns the neutral response when the account is already verified', async () => {
    // findUnverifiedActiveUserByEmail filters by email_verified_at: null, so
    // an already-verified user resolves to null here — same path as "missing".
    repository.findUnverifiedActiveUserByEmail.mockResolvedValue(null);

    const result = await service.resend('verified@example.com');

    expect(result.message).toContain('Si existe una cuenta pendiente');
  });

  it('sendVerification() records a delivery failure without throwing when Resend fails', async () => {
    repository.createToken.mockResolvedValue({ id: 'token-id' });
    notifier.sendVerification.mockRejectedValue(new Error('Resend down'));

    await expect(
      service.sendVerification({
        userId: 'user-id',
        companyId: 'company-id',
        email: 'user@example.com',
        firstName: 'Ana',
      }),
    ).resolves.toBeUndefined();

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'EMAIL_VERIFICATION_DELIVERY_FAILED',
        result: 'FAILURE',
      }),
    );
  });

  it('verify() consumes the token and records EMAIL_VERIFIED on success', async () => {
    repository.verifyToken.mockResolvedValue({
      userId: 'user-id',
      companyId: 'company-id',
    });

    await service.verify('a-valid-opaque-token');

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'EMAIL_VERIFIED',
        result: 'SUCCESS',
        targetUserId: 'user-id',
      }),
    );
  });

  it('verify() rejects an invalid, expired or already-used token', async () => {
    repository.verifyToken.mockResolvedValue(null);

    await expect(service.verify('bad-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(audit.record).not.toHaveBeenCalled();
  });
});
