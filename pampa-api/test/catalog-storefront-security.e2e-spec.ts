import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
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
import { CatalogController } from '../src/modules/catalog/storefront/catalog.controller';
import { CatalogService } from '../src/modules/catalog/storefront/catalog.service';
import { CatalogOrdersController } from '../src/modules/commercial/catalog-orders/catalog-orders.controller';
import { CatalogOrdersService } from '../src/modules/commercial/catalog-orders/catalog-orders.service';
import { StorefrontController } from '../src/modules/storefront/storefront.controller';
import { StorefrontService } from '../src/modules/storefront/storefront.service';
import { TestSessionContextService } from './support/test-session-context.service';

const secret = 'catalog-storefront-security-e2e-secret-32-chars-min';
const companyAId = '11111111-1111-4111-8111-111111111111';
const companyBId = '22222222-2222-4222-8222-222222222222';
const orderAId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const orderBId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('Catalog and public storefront authorization boundaries (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const catalogService = {
    getOwn: jest.fn((context: SecurityContext) =>
      Promise.resolve({ catalog: null, publishedProducts: 0, configured: false, company: context.companyId }),
    ),
    upsert: jest.fn((context: SecurityContext) =>
      Promise.resolve({ id: 'catalog-1', slug: 'demo', company_id: context.companyId }),
    ),
  };

  const catalogOrdersService = {
    findAll: jest.fn(() => Promise.resolve([])),
    findOne: jest.fn((context: SecurityContext, id: string) => {
      const owned = context.companyId === companyAId ? orderAId : orderBId;
      if (id !== owned) throw new NotFoundException('Pedido no encontrado.');
      return Promise.resolve({ id, company: context.companyId });
    }),
    accept: jest.fn((context: SecurityContext, id: string) => {
      const owned = context.companyId === companyAId ? orderAId : orderBId;
      if (id !== owned) throw new NotFoundException('Pedido no encontrado.');
      return Promise.resolve({ id, status: 'ACCEPTED' });
    }),
    reject: jest.fn(() => Promise.resolve({ status: 'REJECTED' })),
  };

  const storefrontService = {
    getCatalog: jest.fn(() => Promise.resolve({ slug: 'demo', displayName: 'Demo' })),
    listCategories: jest.fn(() => Promise.resolve([])),
    listProducts: jest.fn(() =>
      Promise.resolve({ items: [], pagination: { page: 1, limit: 24, total: 0, pages: 0 } }),
    ),
    getProduct: jest.fn(() => Promise.resolve({ id: 'p1' })),
    submitOrder: jest.fn(() =>
      Promise.resolve({ id: 'order-1', orderNumber: 'PED-00000001', status: 'PENDING' }),
    ),
  };

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret,
          signOptions: { issuer: 'pampa-api', audience: 'pampa-web', expiresIn: '15m' },
        }),
      ],
      controllers: [CatalogController, CatalogOrdersController, StorefrontController],
      providers: [
        JwtStrategy,
        { provide: SessionContextService, useClass: TestSessionContextService },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === 'JWT_SECRET' ? secret : undefined) },
        },
        { provide: CatalogService, useValue: catalogService },
        { provide: CatalogOrdersService, useValue: catalogOrdersService },
        { provide: StorefrontService, useValue: storefrontService },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: PermissionGuard },
      ],
    }).compile();

    app = fixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    jwtService = fixture.get(JwtService);
  });

  afterAll(async () => app.close());

  function cookie(companyId: string, permissions: string[]) {
    return `pampa_access=${jwtService.sign({
      sub: companyId === companyAId ? 'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa' : 'bbbbbbbb-2222-4bbb-8bbb-bbbbbbbbbbbb',
      companyId,
      sessionId: permissions.join('|') || 'none',
      tokenVersion: 0,
    })}`;
  }

  describe('admin catalog settings — /catalog', () => {
    it('returns 401 without a session', () =>
      request(app.getHttpServer()).get('/catalog').expect(401));

    it('returns 403 without catalog.read', () =>
      request(app.getHttpServer())
        .get('/catalog')
        .set('Cookie', cookie(companyAId, []))
        .expect(403));

    it('allows GET with catalog.read', () =>
      request(app.getHttpServer())
        .get('/catalog')
        .set('Cookie', cookie(companyAId, ['catalog.read']))
        .expect(200));

    it('rejects PUT with only catalog.read (requires catalog.manage)', () =>
      request(app.getHttpServer())
        .put('/catalog')
        .set('Cookie', cookie(companyAId, ['catalog.read']))
        .send({
          branchId: '11111111-1111-4111-8111-111111111112',
          warehouseId: '11111111-1111-4111-8111-111111111113',
          slug: 'demo',
          displayName: 'Demo',
          isEnabled: true,
          showPrices: true,
          showAvailability: true,
        })
        .expect(403));
  });

  describe('admin catalog orders — /catalog-orders', () => {
    it('returns 401 without a session', () =>
      request(app.getHttpServer()).get('/catalog-orders').expect(401));

    it('returns 403 without catalog_orders.read', () =>
      request(app.getHttpServer())
        .get('/catalog-orders')
        .set('Cookie', cookie(companyAId, []))
        .expect(403));

    it('hides a tenant B order from tenant A', () =>
      request(app.getHttpServer())
        .get(`/catalog-orders/${orderBId}`)
        .set('Cookie', cookie(companyAId, ['catalog_orders.read']))
        .expect(404));

    it('lets tenant B read its own order', () =>
      request(app.getHttpServer())
        .get(`/catalog-orders/${orderBId}`)
        .set('Cookie', cookie(companyBId, ['catalog_orders.read']))
        .expect(200));

    it('rejects accepting a tenant B order from tenant A even with catalog_orders.manage', () =>
      request(app.getHttpServer())
        .post(`/catalog-orders/${orderBId}/accept`)
        .set('Cookie', cookie(companyAId, ['catalog_orders.manage']))
        .expect(404));

    it('rejects accept with only catalog_orders.read (requires manage)', () =>
      request(app.getHttpServer())
        .post(`/catalog-orders/${orderAId}/accept`)
        .set('Cookie', cookie(companyAId, ['catalog_orders.read']))
        .expect(403));
  });

  describe('public storefront — /storefront/:slug', () => {
    it('serves the catalog header with no session cookie at all', () =>
      request(app.getHttpServer()).get('/storefront/demo').expect(200));

    it('serves the product list with no session cookie at all', () =>
      request(app.getHttpServer()).get('/storefront/demo/products').expect(200));

    it('serves a product detail with no session cookie at all', () =>
      request(app.getHttpServer())
        .get('/storefront/demo/products/00000000-0000-4000-8000-000000000000')
        .expect(200));

    it('accepts an order submission with no session cookie at all', () =>
      request(app.getHttpServer())
        .post('/storefront/demo/orders')
        .send({
          customerName: 'Juan Pérez',
          customerPhone: '+5491100000000',
          items: [{ productId: '00000000-0000-4000-8000-000000000000', quantity: 1 }],
        })
        .expect(201));

    it('never lets the client dictate a price, total, or companyId in the order payload', () =>
      request(app.getHttpServer())
        .post('/storefront/demo/orders')
        .send({
          customerName: 'Juan Pérez',
          customerPhone: '+5491100000000',
          companyId: companyBId,
          total: 1,
          items: [
            { productId: '00000000-0000-4000-8000-000000000000', quantity: 1, unitPrice: 1 },
          ],
        })
        // forbidNonWhitelisted rejects unknown fields like companyId/total/unitPrice outright.
        .expect(400));
  });
});
