import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './sessions/session.service';
import { PasswordRecoveryService } from './password/password-recovery.service';
import { RateLimitService } from './rate-limit/rate-limit.service';
import { SecurityAuditService } from './audit/security-audit.service';
import { RegistrationService } from './registration/registration.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: SessionService, useValue: {} },
        { provide: PasswordRecoveryService, useValue: {} },
        { provide: RateLimitService, useValue: {} },
        { provide: SecurityAuditService, useValue: {} },
        { provide: RegistrationService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
