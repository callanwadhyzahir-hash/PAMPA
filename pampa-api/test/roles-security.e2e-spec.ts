import { INestApplication, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { RolesController } from '../src/modules/administration/roles/roles.controller';
import { RolesService } from '../src/modules/administration/roles/roles.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../src/modules/auth/guards/permission.guard';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { SessionContextService } from '../src/modules/auth/sessions/session-context.service';
import { TestSessionContextService } from './support/test-session-context.service';

const secret = 'roles-security-e2e-secret-at-least-32-characters';
const companyId = '11111111-1111-4111-8111-111111111111';
const roleId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const foreignRoleId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('Roles authorization and tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  const service = {
    findAll: jest.fn(() =>
      Promise.resolve([
        {
          id: roleId,
          name: 'Operador',
          system_code: null,
          is_system: false,
        },
      ]),
    ),
    findOne: jest.fn((_context: unknown, id: string) => {
      if (id === foreignRoleId) {
        throw new NotFoundException('Rol no encontrado.');
      }
      return Promise.resolve({ id, name: 'Operador' });
    }),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findPermissions: jest.fn(() => Promise.resolve([])),
    replacePermissions: jest.fn(),
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
      controllers: [RolesController],
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
        { provide: RolesService, useValue: service },
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

  it('returns 401 without a session', () =>
    request(app.getHttpServer()).get('/roles').expect(401));

  it('returns 403 without roles.read', () =>
    request(app.getHttpServer())
      .get('/roles')
      .set('Cookie', cookie([]))
      .expect(403));

  it('lists roles with the required permission', () =>
    request(app.getHttpServer())
      .get('/roles')
      .set('Cookie', cookie(['roles.read']))
      .expect(200));

  it('returns neutral 404 for a foreign role', () =>
    request(app.getHttpServer())
      .get(`/roles/${foreignRoleId}`)
      .set('Cookie', cookie(['roles.read']))
      .expect(404));

  it('protects permission assignment separately', () =>
    request(app.getHttpServer())
      .put(`/roles/${roleId}/permissions`)
      .set('Cookie', cookie(['roles.read']))
      .send({ permissionIds: [] })
      .expect(403));

  it('requires permissions.read for the global approved catalog', () =>
    request(app.getHttpServer())
      .get('/permissions')
      .set('Cookie', cookie(['roles.read']))
      .expect(403));
});
