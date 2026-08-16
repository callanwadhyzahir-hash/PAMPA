import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { MercadoLibreConnectionService } from '../src/modules/integrations/mercadolibre/connection/connection.service';
import { MercadoLibreController } from '../src/modules/integrations/mercadolibre/mercadolibre.controller';
import { MercadoLibreOAuthService } from '../src/modules/integrations/mercadolibre/oauth/oauth.service';
import { MercadoLibreListingsService } from '../src/modules/integrations/mercadolibre/listings/listings.service';
import { MercadoLibreOrdersService } from '../src/modules/integrations/mercadolibre/orders/orders.service';
import { MercadoLibreSyncService } from '../src/modules/integrations/mercadolibre/sync/sync.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../src/modules/auth/guards/permission.guard';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { SessionContextService } from '../src/modules/auth/sessions/session-context.service';
import { TestSessionContextService } from './support/test-session-context.service';

const secret = 'mercadolibre-security-e2e-secret-at-least-32-characters';
const companyId = '11111111-1111-4111-8111-111111111111';

describe('Mercado Libre authorization and secret safety (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;

  const statusPayload = {
    configured: true,
    mockMode: true,
    connected: true,
    account: {
      provider: 'MOCK',
      nickname: 'PAMPA_DEV_TEST',
      mlUserId: '900000001',
      siteId: 'MLA',
      status: 'CONNECTED',
    },
    lastSyncAt: null,
    lastError: null,
  };

  const connections = {
    getStatus: jest.fn(() => Promise.resolve(statusPayload)),
    disconnect: jest.fn(() => Promise.resolve()),
  };
  const oauth = {
    connect: jest.fn(() => Promise.resolve({ mock: true })),
    handleCallback: jest.fn(() => Promise.reject(new Error('missing code/state'))),
  };
  const listings = {
    findAll: jest.fn(() =>
      Promise.resolve({ items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }),
    ),
    link: jest.fn(() => Promise.resolve({ id: 'link-a' })),
    unlink: jest.fn(() => Promise.resolve()),
  };
  const orders = {
    findAll: jest.fn(() =>
      Promise.resolve({ items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }),
    ),
  };
  const sync = {
    sync: jest.fn(() =>
      Promise.resolve({ syncedAt: new Date(), listingsSynced: 0, ordersSynced: 0 }),
    ),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret,
          signOptions: { issuer: 'pampa-api', audience: 'pampa-web', expiresIn: '15m' },
        }),
      ],
      controllers: [MercadoLibreController],
      providers: [
        JwtStrategy,
        { provide: SessionContextService, useClass: TestSessionContextService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === 'JWT_SECRET' ? secret : undefined),
          },
        },
        { provide: MercadoLibreConnectionService, useValue: connections },
        { provide: MercadoLibreOAuthService, useValue: oauth },
        { provide: MercadoLibreListingsService, useValue: listings },
        { provide: MercadoLibreOrdersService, useValue: orders },
        { provide: MercadoLibreSyncService, useValue: sync },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: PermissionGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    jwt = moduleFixture.get(JwtService);
  });

  afterAll(async () => app.close());

  function cookie(permissions: string[]) {
    return `pampa_access=${jwt.sign({
      sub: 'actor',
      companyId,
      sessionId: permissions.join('|') || 'none',
      tokenVersion: 0,
    })}`;
  }

  it('returns 401 without authentication', () =>
    request(app.getHttpServer())
      .get('/integrations/mercadolibre/status')
      .expect(401));

  it('returns 403 without integrations.mercadolibre.read', () =>
    request(app.getHttpServer())
      .get('/integrations/mercadolibre/status')
      .set('Cookie', cookie([]))
      .expect(403));

  it('returns status with integrations.mercadolibre.read', () =>
    request(app.getHttpServer())
      .get('/integrations/mercadolibre/status')
      .set('Cookie', cookie(['integrations.mercadolibre.read']))
      .expect(200));

  it('never leaks access/refresh tokens in the status response', async () => {
    const response = await request(app.getHttpServer())
      .get('/integrations/mercadolibre/status')
      .set('Cookie', cookie(['integrations.mercadolibre.read']))
      .expect(200);
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toMatch(/access_token/i);
    expect(serialized).not.toMatch(/refresh_token/i);
  });

  it('returns 403 for listings without read permission', () =>
    request(app.getHttpServer())
      .get('/integrations/mercadolibre/listings')
      .set('Cookie', cookie([]))
      .expect(403));

  it('returns 403 for orders without read permission', () =>
    request(app.getHttpServer())
      .get('/integrations/mercadolibre/orders')
      .set('Cookie', cookie([]))
      .expect(403));

  it('returns 403 for connect without manage permission', () =>
    request(app.getHttpServer())
      .get('/integrations/mercadolibre/connect')
      .set('Cookie', cookie(['integrations.mercadolibre.read']))
      .expect(403));

  it('allows connect with manage permission', () =>
    request(app.getHttpServer())
      .get('/integrations/mercadolibre/connect')
      .set('Cookie', cookie(['integrations.mercadolibre.manage']))
      .expect(200));

  it('returns 403 for disconnect without manage permission', () =>
    request(app.getHttpServer())
      .post('/integrations/mercadolibre/disconnect')
      .set('Cookie', cookie(['integrations.mercadolibre.read']))
      .expect(403));

  it('returns 403 for sync without manage permission', () =>
    request(app.getHttpServer())
      .post('/integrations/mercadolibre/sync')
      .set('Cookie', cookie(['integrations.mercadolibre.read']))
      .expect(403));

  it('returns 403 for link without manage permission', () =>
    request(app.getHttpServer())
      .post('/integrations/mercadolibre/listings/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/link')
      .set('Cookie', cookie(['integrations.mercadolibre.read']))
      .send({ productId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' })
      .expect(403));

  it('allows link with manage permission', () =>
    request(app.getHttpServer())
      .post('/integrations/mercadolibre/listings/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/link')
      .set('Cookie', cookie(['integrations.mercadolibre.manage']))
      .send({ productId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' })
      .expect(201));

  it('the OAuth callback is public (no auth cookie required)', () =>
    request(app.getHttpServer())
      .get('/integrations/mercadolibre/callback')
      .expect(302));
});
