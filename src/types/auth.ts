export interface AuthUser {
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
  isPlatformAdmin: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  timestamp: string;
  data: T;
}
