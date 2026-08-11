"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Building2, LayoutGrid, LoaderCircle, LogOut, Menu, ShieldAlert, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Topbar } from "@/components/layout/topbar";
import { useAuthSession } from "@/hooks/use-auth-session";
import { authService } from "@/services/auth.service";
import { cn } from "@/lib/utils";

interface AdminNavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

const adminNavigation: AdminNavItem[] = [
  { label: "Resumen", href: "/admin", icon: LayoutGrid },
  { label: "Empresas", href: "/admin/companies", icon: Building2 },
  { label: "Usuarios", href: "/admin/users", icon: Users },
];

function AdminSidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 text-sidebar-foreground",
        className,
      )}
    >
      <Link href="/admin" className="flex flex-col px-3 leading-none">
        <span className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          <span className="font-display text-sm font-medium tracking-[0.08em] text-sidebar-foreground">
            PAMPA
          </span>
        </span>
        <span className="mt-1 pl-3.5 text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
          Platform
        </span>
      </Link>

      <nav className="mt-8 space-y-1" aria-label="Navegación de plataforma">
        {adminNavigation.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "relative flex h-9 items-center gap-3 rounded-sm px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                active
                  ? "text-sidebar-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="admin-sidebar-active"
                  className="absolute inset-0 -z-10 rounded-sm bg-sidebar-accent"
                  transition={{ duration: 0.2 }}
                />
              )}
              {active && (
                <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" aria-hidden />
              )}
              <Icon className="relative size-4" />
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pt-5">
        <Link
          href="/dashboard"
          className="text-caption text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Volver al dashboard
        </Link>
      </div>
    </aside>
  );
}

function Forbidden() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground" role="alert">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-lg border border-destructive/20 bg-destructive-bg">
          <ShieldAlert className="size-5 text-destructive" aria-hidden />
        </div>
        <h1 className="mt-5 text-heading-sm font-medium tracking-[-0.02em]">Acceso restringido</h1>
        <p className="mt-2 text-body-sm leading-6 text-muted-foreground">
          Esta sección es exclusiva para administradores de la plataforma PAMPA.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block text-body-sm font-medium text-primary hover:underline"
        >
          Volver al dashboard
        </Link>
      </div>
    </main>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuthSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  async function handleLogout() {
    try {
      await authService.logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  if (loading || !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-background" aria-live="polite">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Verificando sesión
        </div>
      </main>
    );
  }

  // UX-only gate: hides the shell for non-platform-admins. The backend
  // (PlatformAdminGuard) is the real authority — every /platform-admin/*
  // request is re-checked there regardless of what this renders.
  if (!user.isPlatformAdmin) {
    return <Forbidden />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar className="hidden lg:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          left={
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir navegación"
            >
              <Menu className="size-5" aria-hidden />
            </Button>
          }
          right={
            <>
              <div className="hidden text-right sm:block">
                <p className="text-body-sm font-medium text-foreground">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-caption text-muted-foreground">{user.email}</p>
              </div>
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={() => void handleLogout()} aria-label="Cerrar sesión">
                <LogOut className="size-4" aria-hidden />
              </Button>
            </>
          }
        />
        <div className="flex-1">{children}</div>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 sm:max-w-xs">
          <SheetHeader className="sr-only">
            <SheetTitle>Navegación de plataforma</SheetTitle>
          </SheetHeader>
          <AdminSidebar className="h-full w-full border-r-0" onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
