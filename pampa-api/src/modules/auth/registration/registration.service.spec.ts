import { EmailVerificationNotifierService } from '../email-verification/email-verification-notifier.service';
import { EmailVerificationRepository } from '../email-verification/email-verification.repository';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { RegisterDto } from '../dto/register.dto';
import { RegistrationRepository } from './registration.repository';
import { RegistrationService } from './registration.service';

const dto: RegisterDto = {
  firstName: 'Ana',
  lastName: 'Perez',
  companyName: 'ACME SRL',
  taxId: '20304050607',
  email: 'new@example.com',
  password: 'Str0ngPassword123',
};

const createdTenant = {
  userId: 'user-id',
  companyId: 'company-id',
  email: dto.email,
  firstName: dto.firstName,
};

describe('RegistrationService', () => {
  const repository = { create: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('requests email verification with the data of the tenant that was just created', async () => {
    repository.create.mockResolvedValue(createdTenant);
    const emailVerification = { sendVerification: jest.fn() };
    const service = new RegistrationService(
      repository as unknown as RegistrationRepository,
      emailVerification as unknown as EmailVerificationService,
    );

    const result = await service.register(dto);

    expect(result).toEqual({ userId: 'user-id', companyId: 'company-id' });
    expect(emailVerification.sendVerification).toHaveBeenCalledWith({
      userId: 'user-id',
      companyId: 'company-id',
      email: dto.email,
      firstName: dto.firstName,
    });
  });

  it('does not undo the already-created tenant when Resend fails to deliver the verification email', async () => {
    repository.create.mockResolvedValue(createdTenant);
    const notifier = { sendVerification: jest.fn() };
    const audit = { record: jest.fn() };
    // Uses the real EmailVerificationService (not a mock) so this proves the
    // full chain: a Resend rejection is caught inside sendVerification() and
    // never bubbles up to RegistrationService — the transaction that created
    // the company/OWNER already committed before this call even starts.
    const emailVerification = new EmailVerificationService(
      {
        createToken: jest.fn().mockResolvedValue({ id: 'token-id' }),
      } as unknown as EmailVerificationRepository,
      notifier as unknown as EmailVerificationNotifierService,
      audit as unknown as SecurityAuditService,
    );
    notifier.sendVerification.mockRejectedValue(
      new Error('Resend unavailable'),
    );
    const service = new RegistrationService(
      repository as unknown as RegistrationRepository,
      emailVerification,
    );

    const result = await service.register(dto);

    expect(result).toEqual({ userId: 'user-id', companyId: 'company-id' });
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'EMAIL_VERIFICATION_DELIVERY_FAILED',
      }),
    );
  });
});
