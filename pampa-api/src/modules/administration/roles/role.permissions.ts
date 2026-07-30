export const ROLE_PERMISSIONS = {
  read: 'roles.read',
  create: 'roles.create',
  update: 'roles.update',
  delete: 'roles.delete',
  assignPermissions: 'roles.assign_permissions',
  readPermissions: 'permissions.read',
} as const;

export const RESERVED_DELEGATION_PERMISSIONS = new Set([
  'users.assign_roles',
  'roles.assign_permissions',
]);
