"use client";

import type { ReactNode } from "react";
import {
  ArrowLeftRight,
  Banknote,
  Boxes,
  Building2,
  ChartNoAxesCombined,
  Contact,
  GitBranch,
  LayoutDashboard,
  Package,
  PackageSearch,
  Plug,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  Users,
  Warehouse,
} from "lucide-react";

import { AuthenticatedShell } from "@/components/auth/authenticated-shell";
import type { NavigationItem } from "@/components/layout/sidebar";

const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "General",
  },
  {
    label: "Mi empresa",
    href: "/dashboard/companies",
    icon: Building2,
    permission: "companies.read",
    section: "Organización",
  },
  {
    label: "Sucursales",
    href: "/dashboard/branches",
    icon: GitBranch,
    permission: "branches.read",
    section: "Organización",
  },
  {
    label: "Usuarios",
    href: "/dashboard/users",
    icon: Users,
    permission: "users.read",
    section: "Organización",
  },
  {
    label: "Roles",
    href: "/dashboard/roles",
    icon: ShieldCheck,
    permission: "roles.read",
    section: "Organización",
  },
  {
    label: "Categorías",
    href: "/dashboard/product-categories",
    icon: Tags,
    permission: "product_categories.read",
    section: "Catálogo",
  },
  {
    label: "Productos",
    href: "/dashboard/products",
    icon: Package,
    permission: "products.read",
    section: "Catálogo",
  },
  {
    label: "Catálogo público",
    href: "/dashboard/catalog",
    icon: Store,
    permission: "catalog.read",
    section: "Catálogo",
  },
  {
    label: "Depósitos",
    href: "/dashboard/warehouses",
    icon: Warehouse,
    permission: "warehouses.read",
    section: "Inventario",
  },
  {
    label: "Stock",
    href: "/dashboard/stock",
    icon: Boxes,
    permission: "stock.read",
    section: "Inventario",
  },
  {
    label: "Movimientos",
    href: "/dashboard/stock/movements",
    icon: ArrowLeftRight,
    permission: "stock_movements.read",
    section: "Inventario",
  },
  {
    label: "Clientes",
    href: "/dashboard/clients",
    icon: Contact,
    permission: "clients.read",
    section: "Comercial",
  },
  {
    label: "Ventas",
    href: "/dashboard/sales",
    icon: ShoppingCart,
    permission: "sales.read",
    section: "Comercial",
  },
  {
    label: "Pagos",
    href: "/dashboard/payments",
    icon: Banknote,
    permission: "payments.read",
    section: "Comercial",
  },
  {
    label: "Pedidos del catálogo",
    href: "/dashboard/catalog-orders",
    icon: PackageSearch,
    permission: "catalog_orders.read",
    section: "Comercial",
  },
  {
    label: "Reportes",
    href: "/dashboard/reports",
    icon: ChartNoAxesCombined,
    permission: "sales.read",
    section: "Análisis",
  },
  {
    label: "Mercado Libre",
    href: "/dashboard/integrations/mercadolibre",
    icon: Plug,
    permission: "integrations.mercadolibre.read",
    section: "Integraciones",
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthenticatedShell navigation={navigation}>{children}</AuthenticatedShell>
  );
}
