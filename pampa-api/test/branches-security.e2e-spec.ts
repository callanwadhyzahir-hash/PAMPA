import { INestApplication, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { BranchesController } from '../src/modules/administration/branches/branches.controller';
import { BranchesService } from '../src/modules/administration/branches/branches.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../src/modules/auth/guards/permission.guard';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { SessionContextService } from '../src/modules/auth/sessions/session-context.service';
import { TestSessionContextService } from './support/test-session-context.service';

const secret = 'branches-security-e2e-secret-at-least-32-characters';
const companyId = '11111111-1111-4111-8111-111111111111';
const branchId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const foreignBranchId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('Branches authorization and tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  const service = {
    findAll: jest.fn(() =>
      Promise.resolve([{ id: branchId, name: 'Casa central' }]),
    ),
    findOne: jest.fn((_context: unknown, id: string) => {
      if (id === foreignBranchId) {
        throw new NotFoundException('Sucursal no encontrada.');
      }
      return Promise.resolve({ id, name: 'Casa central' });
    }),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
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
      controllers: [BranchesController],
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
        { provide: BranchesService, useValue: service },
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
    request(app.getHttpServer()).get('/branches').expect(401));

  it('returns 403 without branches.read', () =>
    request(app.getHttpServer())
      .get('/branches')
      .set('Cookie', cookie([]))
      .expect(403));

  it('lists branches with branches.read', () =>
    request(app.getHttpServer())
      .get('/branches')
      .set('Cookie', cookie(['branches.read']))
      .expect(200));

  it('returns neutral 404 for another tenant branch ID', () =>
    request(app.getHttpServer())
      .get(`/branches/${foreignBranchId}`)
      .set('Cookie', cookie(['branches.read']))
      .expect(404));

  it('requires branches.delete for deactivation', () =>
    request(app.getHttpServer())
      .delete(`/branches/${branchId}`)
      .set('Cookie', cookie(['branches.read']))
      .expect(403));
});
