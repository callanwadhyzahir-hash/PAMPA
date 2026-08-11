import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../types/authenticated-request';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Partial<AuthenticatedRequest>>();
    const securityContext = request.user;

    if (!securityContext) {
      throw new UnauthorizedException('La sesión no es válida.');
    }
    if (!securityContext.isPlatformAdmin) {
      throw new ForbiddenException('Se requiere autoridad de plataforma.');
    }
    return true;
  }
}
