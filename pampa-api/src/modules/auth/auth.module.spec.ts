import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './auth.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionGuard } from './guards/permission.guard';

interface GuardProvider {
  provide: string | symbol;
  useClass: unknown;
}

function isGuardProvider(provider: unknown): provider is GuardProvider {
  return (
    typeof provider === 'object' &&
    provider !== null &&
    'provide' in provider &&
    'useClass' in provider
  );
}

describe('AuthModule guard order', () => {
  it('runs JwtAuthGuard before PermissionGuard', () => {
    const providers = Reflect.getMetadata('providers', AuthModule) as unknown[];
    const guards = providers
      .filter(isGuardProvider)
      .filter((provider) => provider.provide === APP_GUARD)
      .map((provider) => provider.useClass);

    expect(guards).toEqual([JwtAuthGuard, PermissionGuard]);
  });
});
