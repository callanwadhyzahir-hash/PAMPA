export interface SecurityContext {
  userId: string;
  companyId: string;
  branchId: string | null;
  sessionId: string;
  tokenVersion: number;
  email: string;
  roles: string[];
  permissions: string[];
  isPlatformAdmin: boolean;
}
