export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  timestamp: string;
  data: T;
}

export interface RoleSummary {
  id: string;
  name: string;
  system_code: string | null;
  is_system: boolean;
  is_active: boolean;
}

export interface UserSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  branch_id: string | null;
  is_active: boolean;
  last_login_at: string | null;
  branch: {
    id: string;
    name: string;
    code: string;
    is_active: boolean;
  } | null;
  user_role: { role: RoleSummary }[];
}

export interface PermissionSummary {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string | null;
}

export interface RoleDetail extends RoleSummary {
  description: string | null;
  role_permission: { permission: PermissionSummary }[];
  _count: { user_role: number };
}

export interface BranchAddress {
  id: string;
  street: string;
  number: string | null;
  floor: string | null;
  apartment: string | null;
  neighborhood: string | null;
  zip_code: string | null;
  observations: string | null;
  city: {
    id: string;
    name: string;
    postal_code: string | null;
    state: {
      id: string;
      name: string;
      country: { id: string; name: string; iso_code: string };
    };
  };
}

export interface BranchDetail {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  is_main: boolean;
  is_active: boolean;
  address: BranchAddress;
  _count: { user: number; warehouse: number; sale: number };
}
