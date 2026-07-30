import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
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
import { ProductCategoriesController } from '../src/modules/catalog/product-categories/product-categories.controller';
import { ProductCategoriesService } from '../src/modules/catalog/product-categories/product-categories.service';
import { ProductsController } from '../src/modules/catalog/products/products.controller';
import { ProductsService } from '../src/modules/catalog/products/products.service';
import { ClientsController } from '../src/modules/commercial/clients/clients.controller';
import { ClientsService } from '../src/modules/commercial/clients/clients.service';
import { PaymentsController } from '../src/modules/commercial/payments/payments.controller';
import { PaymentsService } from '../src/modules/commercial/payments/payments.service';
import { SalesController } from '../src/modules/commercial/sales/sales.controller';
import { SalesService } from '../src/modules/commercial/sales/sales.service';
import { WarehousesController } from '../src/modules/inventory/warehouses/warehouses.controller';
import { WarehousesService } from '../src/modules/inventory/warehouses/warehouses.service';
import { StockController } from '../src/modules/inventory/stock/stock.controller';
import { StockService } from '../src/modules/inventory/stock/stock.service';
import { TestSessionContextService } from './support/test-session-context.service';

const secret = 'erp-domain-security-e2e-secret-at-least-32-characters';
const companyAId = '11111111-1111-4111-8111-111111111111';
const companyBId = '22222222-2222-4222-8222-222222222222';
const resourceAId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const resourceBId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

type ScopedService = {
  findAll: jest.Mock;
  findOne: jest.Mock;
};

function scopedService(): ScopedService {
  return {
    findAll: jest.fn((context: SecurityContext) =>
      Promise.resolve([
        { id: resource(context.companyId), company: context.companyId },
      ]),
    ),
    findOne: jest.fn((context: SecurityContext, id: string) => {
      if (id !== resource(context.companyId)) {
        throw new NotFoundException('Recurso no encontrado.');
      }
      return Promise.resolve({ id, company: context.companyId });
    }),
  };
}

function resource(companyId: string) {
  return companyId === companyAId ? resourceAId : resourceBId;
}

describe('ERP domain authorization and tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  const categories = scopedService();
  const products = scopedService();
  const warehouses = scopedService();
  const clients = scopedService();
  const sales = scopedService();
  const payments = scopedService();
  const stock = scopedService();

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
      controllers: [
        ProductCategoriesController,
        ProductsController,
        WarehousesController,
        StockController,
        ClientsController,
        SalesController,
        PaymentsController,
      ],
      providers: [
        JwtStrategy,
        {
          provide: SessionContextService,
          useClass: TestSessionContextService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === 'JWT_SECRET' ? secret : undefined),
          },
        },
        { provide: ProductCategoriesService, useValue: categories },
        { provide: ProductsService, useValue: products },
        { provide: WarehousesService, useValue: warehouses },
        { provide: StockService, useValue: stock },
        { provide: ClientsService, useValue: clients },
        { provide: SalesService, useValue: sales },
        { provide: PaymentsService, useValue: payments },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: PermissionGuard },
      ],
    }).compile();

    app = fixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    jwtService = fixture.get(JwtService);
  });

  afterAll(async () => app.close());

  function cookie(companyId: string, permissions: string[]) {
    return `pampa_access=${jwtService.sign({
      sub:
        companyId === companyAId
          ? 'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
          : 'bbbbbbbb-2222-4bbb-8bbb-bbbbbbbbbbbb',
      companyId,
      sessionId: permissions.join('|') || 'none',
      tokenVersion: 0,
    })}`;
  }

  const listModules = [
    {
      path: '/product-categories',
      permission: 'product_categories.read',
    },
    { path: '/products', permission: 'products.read' },
    { path: '/warehouses', permission: 'warehouses.read' },
    { path: '/stock', permission: 'stock.read' },
    { path: '/clients', permission: 'clients.read' },
    { path: '/sales', permission: 'sales.read' },
    { path: '/payments', permission: 'payments.read' },
  ];
  const resourceModules = listModules.filter(({ path }) => path !== '/stock');

  it.each(listModules)('$path returns 401 without a session', ({ path }) =>
    request(app.getHttpServer()).get(path).expect(401),
  );

  it.each(listModules)('$path returns 403 without $permission', ({ path }) =>
    request(app.getHttpServer())
      .get(path)
      .set('Cookie', cookie(companyAId, []))
      .expect(403),
  );

  it.each(listModules)(
    '$path resolves list scope exclusively from tenant A token',
    ({ path, permission }) =>
      request(app.getHttpServer())
        .get(path)
        .set('Cookie', cookie(companyAId, [permission]))
        .expect(200)
        .expect([{ id: resourceAId, company: companyAId }]),
  );

  it.each(resourceModules)(
    '$path hides a tenant B resource from tenant A',
    ({ path, permission }) =>
      request(app.getHttpServer())
        .get(`${path}/${resourceBId}`)
        .set('Cookie', cookie(companyAId, [permission]))
        .expect(404),
  );

  it.each(resourceModules)(
    '$path lets tenant B access its own resource',
    ({ path, permission }) =>
      request(app.getHttpServer())
        .get(`${path}/${resourceBId}`)
        .set('Cookie', cookie(companyBId, [permission]))
        .expect(200)
        .expect({ id: resourceBId, company: companyBId }),
  );
});
