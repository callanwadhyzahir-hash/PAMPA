"use client";

import type { ReactNode } from "react";
import {
  Building2,
  GitBranch,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";

import type { NavigationItem } from "@/components/layout/sidebar";
import { AuthenticatedShell } from "@/components/auth/authenticated-shell";

const navigation: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Mi empresa", href: "/dashboard/companies", icon: Building2, permission: "companies.read" },
  { label: "Usuarios", href: "/dashboard/users", icon: Users, permission: "users.read" },
  { label: "Roles", href: "/dashboard/roles", icon: ShieldCheck, permission: "roles.read" },
  { label: "Sucursales", href: "/dashboard/branches", icon: GitBranch, permission: "branches.read" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AuthenticatedShell navigation={navigation}>{children}</AuthenticatedShell>;
}
