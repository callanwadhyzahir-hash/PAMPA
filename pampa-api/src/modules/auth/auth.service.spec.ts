import { Test, TestingModule } from '@nestjs/testing';

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
