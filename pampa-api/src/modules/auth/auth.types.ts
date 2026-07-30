import type { SecurityContext } from './types/security-context';

export interface AuthenticatedUser {
  id: string;
  companyId: string;
  branchId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  company: {
    id: string;
    name: string;
  };
  roles: string[];
  permissions: string[];
}

export interface AccessTokenPayload {
  sub: string;
  companyId: string;
  sessionId: string;
  tokenVersion: number;
}

export type { SecurityContext };
