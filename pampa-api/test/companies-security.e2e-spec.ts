import { INestApplication, ValidationPipe } from '@nestjs/common';
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
import { TestSessionContextService } from './support/test-session-context.service';
import type { SecurityContext } from '../src/modules/auth/types/security-context';
import { CompaniesController } from '../src/modules/core/companies/companies.controller';
import { CompaniesService } from '../src/modules/core/companies/companies.service';

const secret = 'companies-security-e2e-secret-at-least-32-characters';
const companyAId = '11111111-1111-4111-8111-111111111111';
const companyBId = '22222222-2222-4222-8222-222222222222';

describe('Companies authorization and tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let companies: Map<string, { id: string; name: string }>;

  const companiesService = {
    findCurrent: jest.fn((context: SecurityContext) =>
      Promise.resolve(companies.get(context.companyId) ?? null),
    ),
    updateCurrent: jest.fn(
      (context: SecurityContext, update: { name?: string }) => {
        const company = companies.get(context.companyId);
        if (!company) return Promise.resolve(null);
        const updated = { ...company, ...update };
        companies.set(context.companyId, updated);
        return Promise.resolve(updated);
      },
    ),
  };

  beforeAll(async () => {
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
      controllers: [CompaniesController],
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
        { provide: CompaniesService, useValue: companiesService },
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
    jwtService = moduleFixture.get(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    companies = new Map([
      [companyAId, { id: companyAId, name: 'Empresa A' }],
      [companyBId, { id: companyBId, name: 'Empresa B' }],
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  function cookie(
    companyId: string,
    permissions: string[],
    userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  ) {
    const token = jwtService.sign({
      sub: userId,
      companyId,
      sessionId: permissions.join('|') || 'none',
      tokenVersion: 0,
    });
    return `pampa_access=${token}`;
  }

  it('returns 401 without a session', () =>
    request(app.getHttpServer()).get('/companies/current').expect(401));

  it('returns 403 to an authenticated user without permissions', () =>
    request(app.getHttpServer())
      .get('/companies/current')
      .set('Cookie', cookie(companyAId, []))
      .expect(403));

  it('user A reads only company A even when query contains company B', () =>
    request(app.getHttpServer())
      .get(`/companies/current?companyId=${companyBId}`)
      .set('Cookie', cookie(companyAId, ['companies.read']))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ id: companyAId, name: 'Empresa A' });
        expect(companiesService.findCurrent).toHaveBeenCalledWith(
          expect.objectContaining({ companyId: companyAId }),
        );
      }));

  it('user B reads only company B', () =>
    request(app.getHttpServer())
      .get('/companies/current')
      .set(
        'Cookie',
        cookie(
          companyBId,
          ['companies.read'],
          'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        ),
      )
      .expect(200)
      .expect({ id: companyBId, name: 'Empresa B' }));

  it('user A without companies.update receives 403', () =>
    request(app.getHttpServer())
      .patch('/companies/current')
      .set('Cookie', cookie(companyAId, ['companies.read']))
      .send({ name: 'Intento bloqueado' })
      .expect(403));

  it('user A updates only company A and company B remains unchanged', async () => {
    await request(app.getHttpServer())
      .patch('/companies/current')
      .set('Cookie', cookie(companyAId, ['companies.read', 'companies.update']))
      .send({ name: 'Empresa A actualizada' })
      .expect(200)
      .expect({ id: companyAId, name: 'Empresa A actualizada' });

    expect(companies.get(companyBId)).toEqual({
      id: companyBId,
      name: 'Empresa B',
    });
  });

  it.each([
    [{ companyId: companyBId, name: 'Intento cruzado' }],
    [{ isActive: false }],
  ])('rejects protected fields supplied in the body', (body) =>
    request(app.getHttpServer())
      .patch('/companies/current')
      .set('Cookie', cookie(companyAId, ['companies.update']))
      .send(body)
      .expect(400),
  );

  it.each([
    ['get', '/companies'],
    ['get', `/companies/${companyBId}`],
    ['post', '/companies'],
    ['delete', `/companies/${companyBId}`],
  ] as const)('retires the previous global route %s %s', (method, path) =>
    request(app.getHttpServer())
      [method](path)
      .set('Cookie', cookie(companyAId, ['companies.read', 'companies.update']))
      .expect(404),
  );
});
