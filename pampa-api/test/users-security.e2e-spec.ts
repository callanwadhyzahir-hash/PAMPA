import { INestApplication, NotFoundException } from '@nestjs/common';
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
import { UsersController } from '../src/modules/administration/users/users.controller';
import { UsersService } from '../src/modules/administration/users/users.service';

const secret = 'users-security-e2e-secret-at-least-32-characters';
const companyAId = '11111111-1111-4111-8111-111111111111';
const userAId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userBId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('Users authorization and tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;

  const usersService = {
    findAll: jest.fn((context: { companyId: string }) =>
      Promise.resolve([
        {
          id: context.companyId === companyAId ? userAId : userBId,
          email: 'masked@example.com',
        },
      ]),
    ),
    findOne: jest.fn((context: { companyId: string }, id: string) => {
      const expected = context.companyId === companyAId ? userAId : userBId;
      if (id !== expected)
        throw new NotFoundException('Usuario no encontrado.');
      return Promise.resolve({ id, email: 'masked@example.com' });
    }),
    create: jest.fn(() =>
      Promise.resolve({
        id: userBId,
        email: 'created@example.com',
        is_active: true,
      }),
    ),
    update: jest.fn(),
    deactivate: jest.fn(),
    getRoles: jest.fn(() => Promise.resolve([])),
    replaceRoles: jest.fn(() => Promise.resolve([])),
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
      controllers: [UsersController],
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
        { provide: UsersService, useValue: usersService },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: PermissionGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    jwt = moduleFixture.get(JwtService);
  });

  afterAll(async () => app.close());

  function cookie(companyId: string, permissions: string[]) {
    return `pampa_access=${jwt.sign({
      sub: userAId,
      companyId,
      sessionId: permissions.join('|') || 'none',
      tokenVersion: 0,
    })}`;
  }

  it('returns 401 without authentication', () =>
    request(app.getHttpServer()).get('/users').expect(401));

  it('returns 403 without users.read', () =>
    request(app.getHttpServer())
      .get('/users')
      .set('Cookie', cookie(companyAId, []))
      .expect(403));

  it('lists only the authenticated company', () =>
    request(app.getHttpServer())
      .get('/users')
      .set('Cookie', cookie(companyAId, ['users.read']))
      .expect(200)
      .expect([{ id: userAId, email: 'masked@example.com' }]));

  it('returns neutral 404 for another tenant user ID', () =>
    request(app.getHttpServer())
      .get(`/users/${userBId}`)
      .set('Cookie', cookie(companyAId, ['users.read']))
      .expect(404));

  it('never returns password_hash when creating a user', () =>
    request(app.getHttpServer())
      .post('/users')
      .set('Cookie', cookie(companyAId, ['users.create']))
      .send({
        firstName: 'Created',
        lastName: 'User',
        email: 'created@example.com',
        temporaryPassword: 'Strong!Password1',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).not.toHaveProperty('password_hash');
        expect(body).not.toHaveProperty('temporaryPassword');
      }));

  it('requires users.assign_roles for role replacement', () =>
    request(app.getHttpServer())
      .put(`/users/${userBId}/roles`)
      .set('Cookie', cookie(companyAId, ['users.read']))
      .send({ roleIds: [] })
      .expect(403));
});
