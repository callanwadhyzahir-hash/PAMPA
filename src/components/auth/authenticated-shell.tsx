"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LoaderCircle, LogOut } from "lucide-react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";
import { authService } from "@/services/auth.service";
import type { NavigationItem } from "@/components/layout/sidebar";

interface AuthenticatedShellProps {
  children: ReactNode;
  navigation: NavigationItem[];
}

export function AuthenticatedShell({ children, navigation }: AuthenticatedShellProps) {
  const router = useRouter();
  const { user, loading } = useAuthSession();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
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

  const allowedNavigation = navigation.filter(
    (item) => !item.permission || user.permissions.includes(item.permission),
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={allowedNavigation} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={user.company.name}>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Cerrar sesión">
              <LogOut className="size-4" aria-hidden />
            </Button>
          </div>
        </Topbar>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
