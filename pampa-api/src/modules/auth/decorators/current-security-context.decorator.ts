import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest } from '../types/authenticated-request';
import type { SecurityContext } from '../types/security-context';

export const CurrentSecurityContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SecurityContext => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
