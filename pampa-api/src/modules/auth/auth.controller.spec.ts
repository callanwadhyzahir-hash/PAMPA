import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './sessions/session.service';
import { PasswordRecoveryService } from './password/password-recovery.service';
import { RateLimitService } from './rate-limit/rate-limit.service';
import { SecurityAuditService } from './audit/security-audit.service';
import { RegistrationService } from './registration/registration.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = { login: jest.fn() };
  const rateLimit = { consume: jest.fn(), clear: jest.fn() };
  const audit = { record: jest.fn() };
  const configService = {
    get: jest.fn((key: string) =>
      key === 'NODE_ENV' ? 'production' : undefined,
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService },
        { provide: SessionService, useValue: {} },
        { provide: PasswordRecoveryService, useValue: {} },
        { provide: RateLimitService, useValue: rateLimit },
        { provide: SecurityAuditService, useValue: audit },
        { provide: RegistrationService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('sets the refresh cookie scoped to "/" so it survives the /api/backend/* proxy', async () => {
    // The browser only ever calls /api/backend/* (see
    // src/app/api/backend/[...path]/route.ts). A cookie scoped to a
    // narrower path such as '/auth' never matches that request path and
    // would silently stop being sent on refresh — this guards against
    // that regression.
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-a', companyId: 'company-a' },
    });
    const cookie = jest.fn();
    const response = {
      cookie,
      setHeader: jest.fn(),
    } as unknown as Response;

    await controller.login(
      { email: 'owner@example.com', password: 'Str0ng!Pass' },
      '127.0.0.1',
      'jest-test-agent',
      response,
    );

    expect(cookie).toHaveBeenCalledWith(
      'pampa_refresh',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
    expect(cookie).toHaveBeenCalledWith(
      'pampa_access',
      'access-token',
      expect.objectContaining({ path: '/' }),
    );
  });
});
