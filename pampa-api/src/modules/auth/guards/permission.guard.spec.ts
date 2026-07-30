import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { SecurityContext } from '../types/security-context';
import { PermissionGuard } from './permission.guard';

const securityContext: SecurityContext = {
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  companyId: '11111111-1111-4111-8111-111111111111',
  branchId: null,
  email: 'user@example.com',
  roles: ['ADMINISTRATOR'],
  permissions: ['companies.read', 'companies.update'],
};

function createExecutionContext(user?: SecurityContext): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: PermissionGuard;
  let isPublic = false;
  let requiredPermissions: string[] | undefined;

  beforeEach(() => {
    isPublic = false;
    requiredPermissions = undefined;
    reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) return isPublic;
        if (key === REQUIRED_PERMISSIONS_KEY) return requiredPermissions;
        return undefined;
      }),
    };
    guard = new PermissionGuard(reflector as unknown as Reflector);
  });

  it('allows a user with every required permission', () => {
    requiredPermissions = ['companies.read', 'companies.update'];

    expect(guard.canActivate(createExecutionContext(securityContext))).toBe(
      true,
    );
  });

  it('returns 403 when one required permission is missing', () => {
    requiredPermissions = ['companies.read', 'roles.update'];

    expect(() =>
      guard.canActivate(createExecutionContext(securityContext)),
    ).toThrow(ForbiddenException);
  });

  it('returns 403 when the user has no permissions', () => {
    requiredPermissions = ['companies.read'];

    expect(() =>
      guard.canActivate(
        createExecutionContext({ ...securityContext, permissions: [] }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('handles duplicated granted and required permissions safely', () => {
    requiredPermissions = ['companies.read', 'companies.read'];

    expect(
      guard.canActivate(
        createExecutionContext({
          ...securityContext,
          permissions: ['companies.read', 'companies.read'],
        }),
      ),
    ).toBe(true);
  });

  it('returns 401 when permission metadata exists without request.user', () => {
    requiredPermissions = ['companies.read'];

    expect(() => guard.canActivate(createExecutionContext())).toThrow(
      UnauthorizedException,
    );
  });

  it('allows a public endpoint without a security context', () => {
    isPublic = true;
    requiredPermissions = ['companies.read'];

    expect(guard.canActivate(createExecutionContext())).toBe(true);
  });

  it('keeps authenticated endpoints without metadata compatible temporarily', () => {
    expect(guard.canActivate(createExecutionContext(securityContext))).toBe(
      true,
    );
  });
});
