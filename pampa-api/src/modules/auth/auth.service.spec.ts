import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { AuthRepository } from './repositories/auth.repository';
import { SessionService } from './sessions/session.service';

const companyId = '11111111-1111-4111-8111-111111111111';
const storedUser = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  company_id: companyId,
  branch_id: null,
  first_name: 'Usuario',
  last_name: 'Seguro',
  email: 'user@example.com',
  password_hash: 'hash',
  is_active: true,
  token_version: 0,
  platform_admin: null,
  company: {
    id: companyId,
    name: 'Empresa A',
    is_active: true,
  },
  user_role: [
    {
      role: {
        company_id: companyId,
        system_code: 'VIEWER',
        name: 'VIEWER',
        is_active: true,
        role_permission: [
          { permission: { code: 'companies.read' } },
          { permission: { code: 'companies.read' } },
        ],
      },
    },
    {
      role: {
        company_id: '22222222-2222-4222-8222-222222222222',
        system_code: null,
        name: 'FOREIGN_ADMIN',
        is_active: true,
        role_permission: [
          { permission: { code: 'companies.update' } },
          { permission: { code: 'roles.update' } },
        ],
      },
    },
  ],
};

describe('AuthService', () => {
  let service: AuthService;
  const repository = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: repository },
        { provide: SessionService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('ignores roles and permissions belonging to another company', async () => {
    repository.findById.mockResolvedValue(storedUser);

    const user = await service.getCurrentUser(storedUser.id);

    expect(user.roles).toEqual(['VIEWER']);
    expect(user.permissions).toEqual(['companies.read']);
    expect(user.permissions).not.toContain('companies.update');
    expect(user.roles).not.toContain('FOREIGN_ADMIN');
  });

  it('returns the immutable system code instead of the visible role name', async () => {
    repository.findById.mockResolvedValue({
      ...storedUser,
      user_role: [
        {
          role: {
            ...storedUser.user_role[0].role,
            name: 'Propietario',
            system_code: 'OWNER',
          },
        },
      ],
    });

    const user = await service.getCurrentUser(storedUser.id);

    expect(user.roles).toEqual(['OWNER']);
  });
});

describe('AuthService.login', () => {
  let service: AuthService;
  const repository = { findByEmail: jest.fn(), updateLastLogin: jest.fn() };
  const sessions = { create: jest.fn() };

  const baseUser = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    company_id: companyId,
    branch_id: null,
    first_name: 'Usuario',
    last_name: 'Seguro',
    email: 'user@example.com',
    is_active: true,
    token_version: 0,
    platform_admin: null,
    company: { id: companyId, name: 'Empresa A', is_active: true },
    user_role: [],
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: repository },
        { provide: SessionService, useValue: sessions },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('rejects with EMAIL_NOT_VERIFIED (machine-readable) when credentials are correct but the email is unverified', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    repository.findByEmail.mockResolvedValue({
      ...baseUser,
      password_hash: passwordHash,
      email_verified_at: null,
    });

    await expect(
      service.login({ email: baseUser.email, password: 'correct-password' }),
    ).rejects.toMatchObject({
      response: { details: { code: 'EMAIL_NOT_VERIFIED' } },
    });
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('rejects wrong credentials with a generic error, never EMAIL_NOT_VERIFIED, even for an unverified account', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    repository.findByEmail.mockResolvedValue({
      ...baseUser,
      password_hash: passwordHash,
      email_verified_at: null,
    });

    await expect(
      service.login({ email: baseUser.email, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.login({ email: baseUser.email, password: 'wrong-password' }),
    ).rejects.not.toMatchObject({
      response: { details: { code: 'EMAIL_NOT_VERIFIED' } },
    });
  });

  it('runs the same password comparison for a nonexistent email, so EMAIL_NOT_VERIFIED cannot be used to enumerate accounts', async () => {
    repository.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nobody@example.com', password: 'anything' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.login({ email: 'nobody@example.com', password: 'anything' }),
    ).rejects.not.toMatchObject({
      response: { details: { code: 'EMAIL_NOT_VERIFIED' } },
    });
  });

  it('allows login once the email is verified', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    repository.findByEmail.mockResolvedValue({
      ...baseUser,
      password_hash: passwordHash,
      email_verified_at: new Date(),
    });
    sessions.create.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    repository.updateLastLogin.mockResolvedValue({ id: baseUser.id });

    const result = await service.login({
      email: baseUser.email,
      password: 'correct-password',
    });

    expect(result.user.id).toBe(baseUser.id);
    expect(sessions.create).toHaveBeenCalledTimes(1);
  });
});
