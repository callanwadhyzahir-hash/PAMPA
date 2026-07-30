import { UnauthorizedException } from '@nestjs/common';

import { SecurityAuditService } from '../audit/security-audit.service';
import { PasswordNotifierService } from './password-notifier.service';
import { PasswordRecoveryRepository } from './password-recovery.repository';
import { PasswordRecoveryService } from './password-recovery.service';

describe('PasswordRecoveryService', () => {
  const repository = {
    findActiveUserByEmail: jest.fn(),
    createToken: jest.fn(),
    resetPassword: jest.fn(),
  };
  const notifier = { sendReset: jest.fn() };
  const audit = { record: jest.fn() };
  const service = new PasswordRecoveryService(
    repository as unknown as PasswordRecoveryRepository,
    notifier as unknown as PasswordNotifierService,
    audit as unknown as SecurityAuditService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('returns the same neutral response when the email does not exist', async () => {
    repository.findActiveUserByEmail.mockResolvedValue(null);

    await expect(service.forgot('missing@example.com')).resolves.toEqual({
      message:
        'Si existe una cuenta activa con ese correo, recibirás instrucciones.',
    });
    expect(notifier.sendReset).not.toHaveBeenCalled();
  });

  it('stores a hash and sends only the opaque reset token', async () => {
    repository.findActiveUserByEmail.mockResolvedValue({
      id: 'user-id',
      company_id: 'company-id',
      email: 'user@example.com',
      first_name: 'Usuario',
    });

    await service.forgot('user@example.com');

    const createCalls = repository.createToken.mock.calls as unknown as Array<
      [string, string, Date]
    >;
    const notifyCalls = notifier.sendReset.mock.calls as unknown as Array<
      [{ token: string }]
    >;
    const storedHash = createCalls[0][1];
    const sentToken = notifyCalls[0][0].token;
    expect(storedHash).toMatch(/^[a-f0-9]{64}$/);
    expect(sentToken).not.toBe(storedHash);
  });

  it('rejects an expired or reused reset token', async () => {
    repository.resetPassword.mockResolvedValue(null);

    await expect(
      service.reset('invalid-token', 'strong-password-value'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
