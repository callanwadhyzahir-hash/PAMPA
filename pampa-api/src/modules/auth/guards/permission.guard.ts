import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { AuthenticatedRequest } from '../types/authenticated-request';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );

    if (isPublic) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      targets,
    );

    // Transitional compatibility: modules outside this sprint remain
    // authenticated by JwtAuthGuard even without permission metadata.
    if (!requiredPermissions?.length) return true;

    const request = context
      .switchToHttp()
      .getRequest<Partial<AuthenticatedRequest>>();
    const securityContext = request.user;

    if (!securityContext) {
      throw new UnauthorizedException('La sesión no es válida.');
    }

    const grantedPermissions = new Set(securityContext.permissions ?? []);
    const hasAllPermissions = requiredPermissions.every((permission) =>
      grantedPermissions.has(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        'No tenés permisos para realizar esta operación.',
      );
    }

    return true;
  }
}
