import type { Request } from 'express';

import type { SecurityContext } from './security-context';

export interface AuthenticatedRequest extends Request {
  user: SecurityContext;
}
