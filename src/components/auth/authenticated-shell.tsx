"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CircleHelp, LoaderCircle, LogOut, Menu, ShieldCheck } from "lucide-react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuthSession } from "@/hooks/use-auth-session";
import { authService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import type { NavigationItem } from "@/components/layout/sidebar";
import { OnboardingProvider, useOnboarding } from "@/components/onboarding/onboarding-provider";
import { OnboardingEngine } from "@/components/onboarding/onboarding-engine";
import { HelpCenter } from "@/components/onboarding/help-center";

interface AuthenticatedShellProps {
  children: ReactNode;
  navigation: NavigationItem[];
}

function CompanyBranchContext({ user }: { user: AuthUser }) {
  return (
    <div className="hidden items-center gap-4 border-r border-border pr-4 sm:flex">
      <div className="leading-tight">
        <p className="text-caption uppercase tracking-wide text-muted-foreground">
          Empresa
        </p>
        <p className="text-body-sm font-medium text-foreground">
          {user.company.name}
        </p>
      </div>
      <div className="leading-tight">
        <p className="text-caption uppercase tracking-wide text-muted-foreground">
          Sucursal
        </p>
        <p className="text-body-sm font-medium text-foreground">
          {user.branchId ? "Asignada" : "Todas"}
        </p>
      </div>
    </div>
  );
}

/** Bridges the mobile nav Sheet's local state to the onboarding engine, so a step targeting
 * the sidebar can open it on mobile without the engine owning shell layout state. */
function MobileNavBridge({ setMobileNavOpen }: { setMobileNavOpen: (open: boolean) => void }) {
  const { registerMobileNavOpener } = useOnboarding();
  useEffect(() => {
    registerMobileNavOpener(setMobileNavOpen);
    return () => registerMobileNavOpener(null);
  }, [registerMobileNavOpener, setMobileNavOpen]);
  return null;
}

export function AuthenticatedShell({ children, navigation }: AuthenticatedShellProps) {
  const router = useRouter();
  const { user, loading } = useAuthSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [helpCenterOpen, setHelpCenterOpen] = useState(false);

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
    <OnboardingProvider userId={user.id} permissions={user.permissions}>
      <MobileNavBridge setMobileNavOpen={setMobileNavOpen} />
      <div className="flex min-h-screen bg-background">
      <Sidebar items={allowedNavigation} className="hidden lg:flex" />
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
              <CompanyBranchContext user={user} />
              <div className="hidden text-right sm:block" data-tour="topbar-user">
                <p className="text-body-sm font-medium text-foreground">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-caption text-muted-foreground">{user.email}</p>
              </div>
              {user.isPlatformAdmin ? (
                <Link
                  href="/admin"
                  aria-label="Administrar PAMPA"
                  title="Administrar PAMPA"
                  className={buttonVariants({ variant: "ghost", size: "icon" })}
                >
                  <ShieldCheck className="size-4" aria-hidden />
                </Link>
              ) : null}
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setHelpCenterOpen(true)}
                aria-label="Ver tutorial"
                data-tour="help-center-trigger"
              >
                <CircleHelp className="size-4" aria-hidden />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Cerrar sesión">
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
            <SheetTitle>Navegación</SheetTitle>
          </SheetHeader>
          <Sidebar
            items={allowedNavigation}
            className="h-full w-full border-r-0"
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <OnboardingEngine />
      <HelpCenter open={helpCenterOpen} onOpenChange={setHelpCenterOpen} />
      </div>
    </OnboardingProvider>
  );
}
