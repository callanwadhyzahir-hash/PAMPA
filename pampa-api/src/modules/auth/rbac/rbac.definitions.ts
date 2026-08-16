export const SYSTEM_ROLE_CODES = [
  'OWNER',
  'ADMINISTRATOR',
  'MANAGER',
  'SELLER',
  'CASHIER',
  'WAREHOUSE',
  'ACCOUNTANT',
  'VIEWER',
] as const;

export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[number];

export interface PermissionDefinition {
  code: string;
  name: string;
  module: string;
  description: string;
}

export interface SystemRoleDefinition {
  code: SystemRoleCode;
  name: string;
  description: string;
}

const permission = (
  code: string,
  name: string,
  module: string,
  description: string,
): PermissionDefinition => ({ code, name, module, description });

export const TENANT_PERMISSIONS = [
  permission(
    'companies.read',
    'Ver empresa',
    'companies',
    'Consultar la empresa autenticada.',
  ),
  permission(
    'companies.update',
    'Actualizar empresa',
    'companies',
    'Actualizar la empresa autenticada.',
  ),
  permission(
    'branches.read',
    'Ver sucursales',
    'branches',
    'Consultar sucursales de la empresa.',
  ),
  permission(
    'branches.create',
    'Crear sucursales',
    'branches',
    'Crear sucursales en la empresa.',
  ),
  permission(
    'branches.update',
    'Actualizar sucursales',
    'branches',
    'Actualizar sucursales de la empresa.',
  ),
  permission(
    'branches.delete',
    'Eliminar sucursales',
    'branches',
    'Eliminar sucursales de la empresa.',
  ),
  permission(
    'users.read',
    'Ver usuarios',
    'users',
    'Consultar usuarios de la empresa.',
  ),
  permission(
    'users.create',
    'Crear usuarios',
    'users',
    'Crear usuarios en la empresa.',
  ),
  permission(
    'users.update',
    'Actualizar usuarios',
    'users',
    'Actualizar usuarios de la empresa.',
  ),
  permission(
    'users.delete',
    'Eliminar usuarios',
    'users',
    'Eliminar usuarios de la empresa.',
  ),
  permission(
    'users.assign_roles',
    'Asignar roles',
    'users',
    'Asignar roles permitidos a usuarios de la empresa.',
  ),
  permission(
    'roles.read',
    'Ver roles',
    'roles',
    'Consultar roles de la empresa.',
  ),
  permission(
    'roles.create',
    'Crear roles',
    'roles',
    'Crear roles personalizados en la empresa.',
  ),
  permission(
    'roles.update',
    'Actualizar roles',
    'roles',
    'Actualizar roles personalizados de la empresa.',
  ),
  permission(
    'roles.delete',
    'Eliminar roles',
    'roles',
    'Eliminar roles personalizados de la empresa.',
  ),
  permission(
    'roles.assign_permissions',
    'Asignar permisos',
    'roles',
    'Asignar permisos permitidos a roles de la empresa.',
  ),
  permission(
    'permissions.read',
    'Ver permisos',
    'permissions',
    'Consultar el catalogo global de permisos tenant.',
  ),
  permission(
    'products.read',
    'Ver productos',
    'products',
    'Consultar productos de la empresa.',
  ),
  permission(
    'products.create',
    'Crear productos',
    'products',
    'Crear productos en la empresa.',
  ),
  permission(
    'products.update',
    'Actualizar productos',
    'products',
    'Actualizar productos de la empresa.',
  ),
  permission(
    'products.delete',
    'Eliminar productos',
    'products',
    'Eliminar productos de la empresa.',
  ),
  permission(
    'product_categories.read',
    'Ver categorias de producto',
    'product_categories',
    'Consultar categorias de producto.',
  ),
  permission(
    'product_categories.create',
    'Crear categorias de producto',
    'product_categories',
    'Crear categorias de producto.',
  ),
  permission(
    'product_categories.update',
    'Actualizar categorias de producto',
    'product_categories',
    'Actualizar categorias de producto.',
  ),
  permission(
    'product_categories.delete',
    'Eliminar categorias de producto',
    'product_categories',
    'Eliminar categorias de producto.',
  ),
  permission(
    'warehouses.read',
    'Ver depositos',
    'warehouses',
    'Consultar depositos de la empresa.',
  ),
  permission(
    'warehouses.create',
    'Crear depositos',
    'warehouses',
    'Crear depositos en la empresa.',
  ),
  permission(
    'warehouses.update',
    'Actualizar depositos',
    'warehouses',
    'Actualizar depositos de la empresa.',
  ),
  permission(
    'warehouses.delete',
    'Eliminar depositos',
    'warehouses',
    'Eliminar depositos de la empresa.',
  ),
  permission(
    'stock.read',
    'Ver stock',
    'stock',
    'Consultar stock de la empresa.',
  ),
  permission(
    'stock.adjust',
    'Ajustar stock',
    'stock',
    'Registrar ajustes auditables de stock.',
  ),
  permission(
    'stock.transfer',
    'Transferir stock',
    'stock',
    'Transferir stock entre depositos autorizados.',
  ),
  permission(
    'stock_movements.read',
    'Ver movimientos de stock',
    'stock_movements',
    'Consultar movimientos de stock.',
  ),
  permission(
    'stock_movements.create',
    'Crear movimientos de stock',
    'stock_movements',
    'Registrar movimientos de stock autorizados.',
  ),
  permission(
    'clients.read',
    'Ver clientes',
    'clients',
    'Consultar clientes de la empresa.',
  ),
  permission(
    'clients.create',
    'Crear clientes',
    'clients',
    'Crear clientes en la empresa.',
  ),
  permission(
    'clients.update',
    'Actualizar clientes',
    'clients',
    'Actualizar clientes de la empresa.',
  ),
  permission(
    'clients.delete',
    'Eliminar clientes',
    'clients',
    'Eliminar clientes de la empresa.',
  ),
  permission(
    'sales.read',
    'Ver ventas',
    'sales',
    'Consultar ventas de la empresa.',
  ),
  permission(
    'sales.create',
    'Crear ventas',
    'sales',
    'Registrar ventas en la empresa.',
  ),
  permission(
    'sales.update',
    'Actualizar ventas',
    'sales',
    'Actualizar ventas permitidas.',
  ),
  permission(
    'sales.cancel',
    'Cancelar ventas',
    'sales',
    'Cancelar ventas mediante un flujo auditable.',
  ),
  permission(
    'payments.read',
    'Ver pagos',
    'payments',
    'Consultar pagos de la empresa.',
  ),
  permission(
    'payments.create',
    'Crear pagos',
    'payments',
    'Registrar pagos de la empresa.',
  ),
  permission(
    'payments.refund',
    'Reembolsar pagos',
    'payments',
    'Registrar reembolsos auditables.',
  ),
  permission(
    'invoices.read',
    'Ver comprobantes',
    'invoices',
    'Consultar comprobantes de la empresa.',
  ),
  permission(
    'invoices.create',
    'Crear comprobantes',
    'invoices',
    'Emitir comprobantes de la empresa.',
  ),
  permission(
    'invoices.cancel',
    'Cancelar comprobantes',
    'invoices',
    'Cancelar comprobantes mediante un flujo auditable.',
  ),
  permission(
    'integrations.mercadolibre.read',
    'Ver integración Mercado Libre',
    'integrations',
    'Consultar estado, publicaciones y órdenes de Mercado Libre.',
  ),
  permission(
    'integrations.mercadolibre.manage',
    'Gestionar integración Mercado Libre',
    'integrations',
    'Conectar, desconectar, sincronizar y vincular publicaciones de Mercado Libre.',
  ),
] as const satisfies readonly PermissionDefinition[];

export const SYSTEM_ROLES: readonly SystemRoleDefinition[] = [
  {
    code: 'OWNER',
    name: 'Propietario',
    description: 'Propietario protegido de la empresa.',
  },
  {
    code: 'ADMINISTRATOR',
    name: 'Administrador',
    description: 'Administracion operativa de la empresa.',
  },
  {
    code: 'MANAGER',
    name: 'Gerente',
    description: 'Gestion general de la operacion.',
  },
  {
    code: 'SELLER',
    name: 'Vendedor',
    description: 'Gestion comercial y de ventas.',
  },
  {
    code: 'CASHIER',
    name: 'Cajero',
    description: 'Cobros y registracion de pagos.',
  },
  {
    code: 'WAREHOUSE',
    name: 'Deposito',
    description: 'Operacion de inventario y depositos.',
  },
  {
    code: 'ACCOUNTANT',
    name: 'Contador',
    description: 'Consulta y gestion contable.',
  },
  {
    code: 'VIEWER',
    name: 'Consulta',
    description: 'Rol sin permisos predeterminados.',
  },
];

const allPermissionCodes = TENANT_PERMISSIONS.map(({ code }) => code);

export const ROLE_PERMISSION_MATRIX: Readonly<
  Record<SystemRoleCode, readonly string[]>
> = {
  OWNER: allPermissionCodes,
  ADMINISTRATOR: allPermissionCodes,
  MANAGER: [
    'companies.read',
    'branches.read',
    'products.read',
    'products.create',
    'products.update',
    'products.delete',
    'product_categories.read',
    'product_categories.create',
    'product_categories.update',
    'product_categories.delete',
    'warehouses.read',
    'stock.read',
    'stock.adjust',
    'stock.transfer',
    'stock_movements.read',
    'clients.read',
    'clients.create',
    'clients.update',
    'clients.delete',
    'sales.read',
    'sales.create',
    'sales.update',
    'sales.cancel',
    'payments.read',
    'invoices.read',
    'integrations.mercadolibre.read',
    'integrations.mercadolibre.manage',
  ],
  SELLER: [
    'products.read',
    'product_categories.read',
    'stock.read',
    'clients.read',
    'clients.create',
    'clients.update',
    'sales.read',
    'sales.create',
    'sales.update',
    'payments.read',
    'integrations.mercadolibre.read',
  ],
  CASHIER: [
    'products.read',
    'clients.read',
    'sales.read',
    'payments.read',
    'payments.create',
  ],
  WAREHOUSE: [
    'products.read',
    'product_categories.read',
    'warehouses.read',
    'stock.read',
    'stock.adjust',
    'stock.transfer',
    'stock_movements.read',
    'stock_movements.create',
  ],
  ACCOUNTANT: [
    'companies.read',
    'clients.read',
    'sales.read',
    'payments.read',
    'invoices.read',
    'invoices.create',
    'invoices.cancel',
  ],
  VIEWER: [],
};
