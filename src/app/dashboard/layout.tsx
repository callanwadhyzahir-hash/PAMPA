"use client";

import type { ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";

import type { NavigationItem } from "@/components/layout/sidebar";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

const navigation: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, active: true },
  { label: "Empresas", href: "/dashboard/companies", icon: Building2 },
  { label: "Productos", href: "/dashboard/productos", icon: Package },
  { label: "Clientes", href: "/dashboard/clientes", icon: Users },
  { label: "Inventario", href: "/dashboard/inventario", icon: Boxes },
  { label: "Ventas", href: "/dashboard/ventas", icon: ShoppingCart },
  { label: "Compras", href: "/dashboard/compras", icon: ClipboardList },
  { label: "Reportes", href: "/dashboard/reportes", icon: BarChart3 },
  { label: "Configuracion", href: "/dashboard/configuracion", icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={navigation} />
      <div className="flex flex-1 flex-col">
        <Topbar title="Dashboard" />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
