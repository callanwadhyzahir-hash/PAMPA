import {
  ROLE_PERMISSION_MATRIX,
  SYSTEM_ROLE_CODES,
  SYSTEM_ROLES,
  TENANT_PERMISSIONS,
} from './rbac.definitions';

describe('RBAC definitions', () => {
  const permissionCodes = TENANT_PERMISSIONS.map(({ code }) => code);

  it('defines unique tenant permissions without platform capabilities', () => {
    expect(new Set(permissionCodes).size).toBe(permissionCodes.length);
    expect(permissionCodes).toHaveLength(50);
    expect(
      permissionCodes.some((code) =>
        /^(platform|countries|currencies|company_types|tax_conditions)\./.test(
          code,
        ),
      ),
    ).toBe(false);
    expect(permissionCodes).not.toContain('companies.create');
    expect(permissionCodes).not.toContain('companies.delete');
  });

  it('defines every system role exactly once', () => {
    expect(SYSTEM_ROLES.map(({ code }) => code)).toEqual(SYSTEM_ROLE_CODES);
    expect(new Set(SYSTEM_ROLES.map(({ code }) => code)).size).toBe(
      SYSTEM_ROLE_CODES.length,
    );
  });

  it('assigns OWNER and ADMINISTRATOR every approved tenant permission', () => {
    expect(ROLE_PERMISSION_MATRIX.OWNER).toEqual(permissionCodes);
    expect(ROLE_PERMISSION_MATRIX.ADMINISTRATOR).toEqual(permissionCodes);
  });

  it('keeps CASHIER without refunds and VIEWER empty', () => {
    expect(ROLE_PERMISSION_MATRIX.CASHIER).toEqual([
      'products.read',
      'clients.read',
      'sales.read',
      'payments.read',
      'payments.create',
    ]);
    expect(ROLE_PERMISSION_MATRIX.CASHIER).not.toContain('payments.refund');
    expect(ROLE_PERMISSION_MATRIX.VIEWER).toEqual([]);
  });

  it.each(SYSTEM_ROLE_CODES)(
    'contains only approved, non-duplicated permissions for %s',
    (roleCode) => {
      const matrix = ROLE_PERMISSION_MATRIX[roleCode];
      expect(new Set(matrix).size).toBe(matrix.length);
      expect(matrix.every((code) => permissionCodes.includes(code))).toBe(true);
    },
  );
});
