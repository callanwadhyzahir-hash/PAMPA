import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../src/modules/auth/guards/permission.guard';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { SessionContextService } from '../src/modules/auth/sessions/session-context.service';
import type { SecurityContext } from '../src/modules/auth/types/security-context';
import { ProductsController } from '../src/modules/catalog/products/products.controller';
import { ProductsService } from '../src/modules/catalog/products/products.service';
import { PlatformAdminController } from '../src/modules/platform-admin/platform-admin.controller';
import { PlatformAdminService } from '../src/modules/platform-admin/platform-admin.service';

const secret = 'platform-admin-security-e2e-secret-at-least-32-chars';
const companyAId = '11111111-1111-4111-8111-111111111111';
const companyBId = '22222222-2222-4222-8222-222222222222';
const productAId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userAId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

// The platform admin's own user still belongs to Company A, exactly like a
// regular OWNER — being PLATFORM_ADMIN must never change tenant scoping on
// ordinary ERP endpoints (only /platform-admin/* is cross-tenant).
const OWNER_SESSION = 'owner-session';
const PLATFORM_ADMIN_SESSION = 'platform-admin-session';

function baseContext(
  sessionId: string,
  isPlatformAdmin: boolean,
): SecurityContext {
  return {
    userId: isPlatformAdmin ? 'admin-user-id' : 'owner-user-id',
    companyId: companyAId,
    branchId: null,
    sessionId,
    tokenVersion: 0,
    email: isPlatformAdmin ? 'admin@example.com' : 'owner@example.com',
    roles: ['OWNER'],
    permissions: ['products.read'],
    isPlatformAdmin,
  };
}

describe('PlatformAdmin authorization and tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const platformAdminService = {
    overview: jest.fn(() => Promise.resolve({ totalCompanies: 2 })),
    growth: jest.fn(() => Promise.resolve({ days: 30, series: [] })),
    securitySummary: jest.fn(() =>
      Promise.resolve({
        users: {
          total: 2,
          pendingVerification: 0,
          verified: 2,
          deactivated: 0,
        },
        emails: {
          sentLast7d: 0,
          verifiedLast7d: 0,
          deliveryFailuresLast7d: 0,
          deliveryFailuresLast30d: 0,
        },
        auth: { failedLoginsLast24h: 0, failedLoginsLast7d: 0 },
      }),
    ),
    listCompanies: jest.fn(() =>
      Promise.resolve({
        items: [
          { id: companyAId, name: 'Company A' },
          { id: companyBId, name: 'Company B' },
        ],
        pagination: { page: 1, limit: 20, total: 2, pages: 1 },
      }),
    ),
    getCompany: jest.fn(),
    updateCompanyStatus: jest.fn(),
    listUsers: jest.fn(() =>
      Promise.resolve({
        items: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      }),
    ),
    listActivity: jest.fn(() =>
      Promise.resolve({
        items: [],
        pagination: { page: 1, limit: 30, total: 0, pages: 0 },
      }),
    ),
    getUser: jest.fn(() =>
      Promise.resolve({ id: userAId, email: 'user-a@example.com' }),
    ),
    systemStatus: jest.fn(() =>
      Promise.resolve({
        status: 'HEALTHY',
        timestamp: new Date().toISOString(),
        environment: 'test',
        version: '0.0.1',
        commit: null,
        uptimeSeconds: 1,
        api: { status: 'HEALTHY' },
        database: { status: 'HEALTHY', latencyMs: 1 },
        migrations: {
          status: 'HEALTHY',
          appliedCount: 1,
          latestMigration: 'x',
          latestAppliedAt: new Date().toISOString(),
          pending: false,
        },
        email: {
          status: 'UNAVAILABLE',
          configured: false,
          deliveryFailuresLast7d: 0,
        },
      }),
    ),
  };

  const productsService = {
    findAll: jest.fn((context: SecurityContext) =>
      Promise.resolve(
        context.companyId === companyAId
          ? [{ id: productAId, company: companyAId }]
          : [],
      ),
    ),
  };

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
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
      controllers: [PlatformAdminController, ProductsController],
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === 'JWT_SECRET' ? secret : undefined),
          },
        },
        { provide: PlatformAdminService, useValue: platformAdminService },
        { provide: ProductsService, useValue: productsService },
        {
          provide: SessionContextService,
          useValue: {
            resolve: (input: { sessionId: string }) =>
              Promise.resolve(
                baseContext(
                  input.sessionId,
                  input.sessionId === PLATFORM_ADMIN_SESSION,
                ),
              ),
          },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: PermissionGuard },
      ],
    }).compile();

    app = fixture.createNestApplication();
    await app.init();
    jwtService = fixture.get(JwtService);
  });

  afterAll(async () => app.close());

  async function cookieFor(sessionId: string) {
    const token = await jwtService.signAsync({
      sub:
        sessionId === PLATFORM_ADMIN_SESSION
          ? 'admin-user-id'
          : 'owner-user-id',
      companyId: companyAId,
      sessionId,
      tokenVersion: 0,
    });
    return `pampa_access=${token}`;
  }

  it('rejects a regular OWNER (not PLATFORM_ADMIN) from every /platform-admin/* route with 403', async () => {
    const cookie = await cookieFor(OWNER_SESSION);
    await request(app.getHttpServer())
      .get('/platform-admin/overview')
      .set('Cookie', cookie)
      .expect(403);
    await request(app.getHttpServer())
      .get('/platform-admin/companies')
      .set('Cookie', cookie)
      .expect(403);
    await request(app.getHttpServer())
      .get('/platform-admin/users')
      .set('Cookie', cookie)
      .expect(403);
    await request(app.getHttpServer())
      .get('/platform-admin/activity')
      .set('Cookie', cookie)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/platform-admin/users/${userAId}`)
      .set('Cookie', cookie)
      .expect(403);
    await request(app.getHttpServer())
      .get('/platform-admin/security')
      .set('Cookie', cookie)
      .expect(403);
    await request(app.getHttpServer())
      .get('/platform-admin/overview/growth')
      .set('Cookie', cookie)
      .expect(403);
    await request(app.getHttpServer())
      .get('/platform-admin/system')
      .set('Cookie', cookie)
      .expect(403);
  });

  it('allows PLATFORM_ADMIN into every /platform-admin/* route with 200', async () => {
    const cookie = await cookieFor(PLATFORM_ADMIN_SESSION);
    await request(app.getHttpServer())
      .get('/platform-admin/overview')
      .set('Cookie', cookie)
      .expect(200);
    await request(app.getHttpServer())
      .get('/platform-admin/companies')
      .set('Cookie', cookie)
      .expect(200);
    await request(app.getHttpServer())
      .get('/platform-admin/users')
      .set('Cookie', cookie)
      .expect(200);
    await request(app.getHttpServer())
      .get('/platform-admin/activity')
      .set('Cookie', cookie)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/platform-admin/users/${userAId}`)
      .set('Cookie', cookie)
      .expect(200);
    await request(app.getHttpServer())
      .get('/platform-admin/security')
      .set('Cookie', cookie)
      .expect(200);
    await request(app.getHttpServer())
      .get('/platform-admin/overview/growth')
      .set('Cookie', cookie)
      .expect(200);
    await request(app.getHttpServer())
      .get('/platform-admin/system')
      .set('Cookie', cookie)
      .expect(200);
  });

  it('GET /platform-admin/system never leaks configured secret values', async () => {
    const cookie = await cookieFor(PLATFORM_ADMIN_SESSION);
    const response = await request(app.getHttpServer())
      .get('/platform-admin/system')
      .set('Cookie', cookie)
      .expect(200);

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toMatch(/DATABASE_URL|JWT_SECRET|RESEND_API_KEY/i);
  });

  it('lets PLATFORM_ADMIN see companies across tenants through /platform-admin/companies', async () => {
    const cookie = await cookieFor(PLATFORM_ADMIN_SESSION);
    const response = await request(app.getHttpServer())
      .get('/platform-admin/companies')
      .set('Cookie', cookie)
      .expect(200);

    const ids = (response.body as { items: { id: string }[] }).items.map(
      (item) => item.id,
    );
    expect(ids).toEqual(expect.arrayContaining([companyAId, companyBId]));
  });

  it('regla crítica: a PLATFORM_ADMIN still only sees their own tenant on GET /products', async () => {
    const cookie = await cookieFor(PLATFORM_ADMIN_SESSION);
    const response = await request(app.getHttpServer())
      .get('/products')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toEqual([{ id: productAId, company: companyAId }]);
    const [calledContext] = productsService.findAll.mock.calls[0];
    expect(calledContext).toEqual(
      expect.objectContaining({ companyId: companyAId, isPlatformAdmin: true }),
    );
  });
});
