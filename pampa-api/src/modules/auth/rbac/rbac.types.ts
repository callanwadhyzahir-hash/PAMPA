import type {
  PermissionDefinition,
  SystemRoleDefinition,
  SystemRoleCode,
} from './rbac.definitions';

export interface RbacBootstrapInput {
  permissions: readonly PermissionDefinition[];
  roles: readonly SystemRoleDefinition[];
  matrix: Readonly<Record<SystemRoleCode, readonly string[]>>;
}

export interface RbacBootstrapSummary {
  permissionsSynchronized: number;
  activeCompanies: number;
  systemRolesSynchronized: number;
  rolePermissionSetsSynchronized: number;
}

export interface OwnerAssignmentSummary {
  userName: string;
  companyName: string;
  roleCode: SystemRoleCode;
  alreadyAssigned: boolean;
}
