import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../src/modules/auth/guards/permission.guard';
import { ROLE_PERMISSION_MATRIX } from '../src/modules/auth/rbac/rbac.definitions';
import { AuthRepository } from '../src/modules/auth/repositories/auth.repository';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { SessionService } from '../src/modules/auth/sessions/session.service';
import { SessionContextService } from '../src/modules/auth/sessions/session-context.service';
import { PasswordRecoveryService } from '../src/modules/auth/password/password-recovery.service';
import { RateLimitService } from '../src/modules/auth/rate-limit/rate-limit.service';
import { SecurityAuditService } from '../src/modules/auth/audit/security-audit.service';
import { RegistrationService } from '../src/modules/auth/registration/registration.service';
import { CompaniesController } from '../src/modules/core/companies/companies.controller';
import { CompaniesService } from '../src/modules/core/companies/companies.service';

const secret = 'owner-auth-e2e-secret-with-at-least-32-characters';
const companyId = '11111111-1111-4111-8111-111111111111';
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('OWNER authentication and authorization (e2e)', () => {
  let app: INestApplication<App>;
  let storedUser: Record<string, unknown>;

  const authRepository = {
    findByEmail: jest.fn(() => Promise.resolve(storedUser)),
    findById: jest.fn(() => Promise.resolve(storedUser)),
    updateLastLogin: jest.fn(() => Promise.resolve({ id: userId })),
  };
  const companiesService = {
    findCurrent: jest.fn(() =>
      Promise.resolve({ id: companyId, name: 'Tenant fixture' }),
    ),
    updateCurrent: jest.fn(() =>
      Promise.resolve({ id: companyId, name: 'Tenant actualizado' }),
    ),
  };

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('fixture-password', 4);
    storedUser = {
      id: userId,
      company_id: companyId,
      branch_id: null,
      first_name: 'Owner',
      last_name: 'Fixture',
      email: 'owner.fixture@example.com',
      password_hash: passwordHash,
      is_active: true,
      token_version: 0,
      company: {
        id: companyId,
        name: 'Tenant fixture',
        is_active: true,
      },
      user_role: [
        {
          role: {
            company_id: companyId,
            system_code: 'OWNER',
            name: 'Propietario',
            is_active: true,
            role_permission: ROLE_PERMISSION_MATRIX.OWNER.map((code) => ({
              permission: { code },
            })),
          },
        },
      ],
    };

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
      controllers: [AuthController, CompaniesController],
      providers: [
        AuthService,
        JwtStrategy,
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
        { provide: AuthRepository, useValue: authRepository },
        { provide: CompaniesService, useValue: companiesService },
        {
          provide: SessionService,
          inject: [JwtService],
          useFactory: (jwt: JwtService) => ({
            create: async () => ({
              accessToken: await jwt.signAsync({
                sub: userId,
                companyId,
                sessionId: 'fixture-session',
                tokenVersion: 0,
              }),
              refreshToken: 'fixture-refresh-token',
            }),
          }),
        },
        {
          provide: SessionContextService,
          useValue: {
            resolve: () =>
              Promise.resolve({
                userId,
                companyId,
                branchId: null,
                sessionId: 'fixture-session',
                tokenVersion: 0,
                email: 'owner.fixture@example.com',
                roles: ['OWNER'],
                permissions: ROLE_PERMISSION_MATRIX.OWNER,
              }),
          },
        },
        { provide: PasswordRecoveryService, useValue: {} },
        {
          provide: RateLimitService,
          useValue: {
            consume: jest.fn(),
            clear: jest.fn(),
          },
        },
        { provide: SecurityAuditService, useValue: { record: jest.fn() } },
        { provide: RegistrationService, useValue: { register: jest.fn() } },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: PermissionGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => app.close());

  it('logs in as OWNER, exposes permissions and accesses Companies', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'owner.fixture@example.com',
        password: 'fixture-password',
      })
      .expect(200);

    const loginBody = login.body as {
      roles: string[];
      permissions: string[];
    };
    expect(loginBody.roles).toEqual(['OWNER']);
    expect(loginBody.permissions).toEqual(ROLE_PERMISSION_MATRIX.OWNER);
    const cookie = login.headers['set-cookie'];

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookie)
      .expect(200)
      .expect(({ body }) => {
        const currentUser = body as {
          roles: string[];
          permissions: string[];
        };
        expect(currentUser.roles).toEqual(['OWNER']);
        expect(currentUser.permissions).toContain('companies.read');
        expect(currentUser.permissions).toContain('companies.update');
      });

    await request(app.getHttpServer())
      .get('/companies/current')
      .set('Cookie', cookie)
      .expect(200)
      .expect({ id: companyId, name: 'Tenant fixture' });

    await request(app.getHttpServer())
      .patch('/companies/current')
      .set('Cookie', cookie)
      .send({ name: 'Tenant actualizado' })
      .expect(200);
  });
});
