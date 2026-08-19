"use client";

import type { ComponentType } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavigationItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  permission?: string;
  section?: string;
};

type SidebarProps = {
  items: NavigationItem[];
  className?: string;
  /** Called after a nav Link is activated — used to close the mobile Sheet. */
  onNavigate?: () => void;
};

function Sidebar({ items, className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 text-sidebar-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-3">
        <span className="size-1.5 rounded-full bg-primary" aria-hidden />
        <span className="font-display text-sm font-medium tracking-[0.08em] text-sidebar-foreground">
          PAMPA
        </span>
      </div>

      <nav
        className="mt-8 min-h-0 flex-1 space-y-1 overflow-y-auto"
        aria-label="Navegación principal"
      >
        {items.map(({ label, href, icon: Icon, section }, index) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(`${href}/`));
          return (
            <div key={href}>
              {section && section !== items[index - 1]?.section ? (
                <p className="mb-2 mt-5 px-3 text-caption uppercase tracking-[0.14em] text-deep-fern first:mt-0">
                  {section}
                </p>
              ) : null}
              <Link
                href={href}
                onClick={onNavigate}
                className={cn(
                  "relative flex h-10 items-center gap-3 rounded-sm px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                  active
                    ? "text-sidebar-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 -z-10 rounded-sm bg-sidebar-accent"
                    transition={{ duration: 0.2 }}
                  />
                )}
                {active && (
                  <span
                    className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                    aria-hidden
                  />
                )}

                <Icon className="relative size-4" />

                <span className="relative">{label}</span>
              </Link>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export { Sidebar };
export type { NavigationItem, SidebarProps };
