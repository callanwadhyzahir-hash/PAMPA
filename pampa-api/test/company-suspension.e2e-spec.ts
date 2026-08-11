import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { EmailVerificationService } from '../src/modules/auth/email-verification/email-verification.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../src/modules/auth/guards/permission.guard';
import { PasswordRecoveryService } from '../src/modules/auth/password/password-recovery.service';
import { RateLimitService } from '../src/modules/auth/rate-limit/rate-limit.service';
import { RegistrationService } from '../src/modules/auth/registration/registration.service';
import { AuthRepository } from '../src/modules/auth/repositories/auth.repository';
import { SecurityAuditService } from '../src/modules/auth/audit/security-audit.service';
import { SessionContextService } from '../src/modules/auth/sessions/session-context.service';
import { SessionRepository } from '../src/modules/auth/sessions/session.repository';
import { SessionService } from '../src/modules/auth/sessions/session.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { ProductsController } from '../src/modules/catalog/products/products.controller';
import { ProductsService } from '../src/modules/catalog/products/products.service';

const secret = 'company-suspension-e2e-secret-with-at-least-32-characters';
const companyId = '11111111-1111-4111-8111-111111111111';
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

/**
 * Fakes the Prisma-backed SessionRepository. `companySuspended` mirrors
 * flipping `company.is_active` — the real SessionRepository.findContext and
 * .rotate both filter on `company: { is_active: true }`, so this reproduces
 * that gate without needing a live Postgres database.
 */
class FakeSessionRepository {
  companySuspended = false;

  create() {
    return Promise.resolve({ id: 'session-id', family_id: 'family-id' });
  }

  findContext(input: {
    sessionId: string;
    userId: string;
    companyId: string;
    tokenVersion: number;
  }) {
    if (this.companySuspended) return Promise.resolve(null);
    return Promise.resolve({
      id: input.sessionId,
      user: {
        id: input.userId,
        company_id: input.companyId,
        branch_id: null,
        first_name: 'Owner',
        last_name: 'Fixture',
        email: 'owner@example.com',
        is_active: true,
        token_version: input.tokenVersion,
        company: { id: input.companyId, name: 'Tenant', is_active: true },
        platform_admin: null,
        user_role: [
          {
            role: {
              company_id: input.companyId,
              system_code: 'OWNER',
              name: 'Propietario',
              is_active: true,
              role_permission: [{ permission: { code: 'products.read' } }],
            },
          },
        ],
      },
    });
  }

  rotate() {
    if (this.companySuspended) {
      return Promise.resolve({ status: 'REUSED_OR_INACTIVE' as const });
    }
    return Promise.resolve({
      status: 'ROTATED' as const,
      sessionId: 'session-id',
      userId,
      companyId,
      tokenVersion: 0,
    });
  }

  revoke() {
    return Promise.resolve({ count: 0 });
  }

  revokeAll() {
    return Promise.resolve();
  }

  list() {
    return Promise.resolve([]);
  }
}

describe('Company suspension is effective on existing sessions (e2e)', () => {
  let app: INestApplication<App>;
  const fakeSessionRepository = new FakeSessionRepository();
  const authRepository = { findByEmail: jest.fn(), updateLastLogin: jest.fn() };
  const productsService = { findAll: jest.fn(() => Promise.resolve([])) };

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('fixture-password', 4);
    authRepository.findByEmail.mockResolvedValue({
      id: userId,
      company_id: companyId,
      branch_id: null,
      first_name: 'Owner',
      last_name: 'Fixture',
      email: 'owner@example.com',
      password_hash: passwordHash,
      is_active: true,
      token_version: 0,
      email_verified_at: new Date(),
      platform_admin: null,
      company: { id: companyId, name: 'Tenant', is_active: true },
      user_role: [
        {
          role: {
            company_id: companyId,
            system_code: 'OWNER',
            name: 'Propietario',
            is_active: true,
            role_permission: [{ permission: { code: 'products.read' } }],
          },
        },
      ],
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret,
          signOptions: {
            issuer: 'pampa-api',
            audience: 'pampa-web',
            expiresIn: '15m',
          },
        }),
      ],
      controllers: [AuthController, ProductsController],
      providers: [
        AuthService,
        SessionService,
        SessionContextService,
        JwtStrategy,
        { provide: SessionRepository, useValue: fakeSessionRepository },
        { provide: AuthRepository, useValue: authRepository },
        { provide: ProductsService, useValue: productsService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'JWT_SECRET') return secret;
              if (key === 'NODE_ENV') return 'test';
              return undefined;
            },
          },
        },
        { provide: PasswordRecoveryService, useValue: {} },
        {
          provide: RateLimitService,
          useValue: { consume: jest.fn(), clear: jest.fn() },
        },
        { provide: SecurityAuditService, useValue: { record: jest.fn() } },
        { provide: RegistrationService, useValue: { register: jest.fn() } },
        {
          provide: EmailVerificationService,
          useValue: { verify: jest.fn(), resend: jest.fn() },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: PermissionGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => app.close());

  it('rejects the existing access token and refresh token once the company is suspended, and both work again after reactivation', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'owner@example.com', password: 'fixture-password' })
      .expect(200);
    const cookies = login.headers['set-cookie'];

    // Sanity check: works normally before suspension.
    await request(app.getHttpServer())
      .get('/products')
      .set('Cookie', cookies)
      .expect(200);

    fakeSessionRepository.companySuspended = true;

    // 1) Same, still-unexpired access token: a tenant endpoint must reject it.
    await request(app.getHttpServer())
      .get('/products')
      .set('Cookie', cookies)
      .expect(401);

    // 2) The existing refresh token must also be rejected — a suspended
    // company cannot keep operating for up to 15 minutes on a stale JWT.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookies)
      .expect(401);

    fakeSessionRepository.companySuspended = false;

    // 3) Reactivation: the SAME access token works again immediately —
    // company.is_active is re-checked on every request via
    // SessionContextService, so no new login is required after reactivating.
    await request(app.getHttpServer())
      .get('/products')
      .set('Cookie', cookies)
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookies)
      .expect(200);
  });
});
