"use client";

import type { ComponentType } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

type NavigationItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  active?: boolean;
};

type SidebarProps = {
  items: NavigationItem[];
  className?: string;
};

function Sidebar({ items, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex min-h-screen w-64 shrink-0 flex-col bg-sidebar px-3 py-5 text-sidebar-foreground",
        className
      )}
    >
      <div className="px-3 text-sm font-semibold tracking-[0.12em]">
        PAMPA
      </div>

      <nav
        className="mt-8 space-y-1"
        aria-label="Navegación principal"
      >
        {items.map(({ label, href, icon: Icon, active }) => (
          <a
            key={href}
            href={href}
            className={cn(
              "relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-200",
              active
                ? "text-white"
                : "text-gray-400 hover:bg-sidebar-accent hover:text-white"
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 -z-10 rounded-xl bg-sidebar-accent"
                transition={{ duration: 0.2 }}
              />
            )}

            <Icon className="relative size-4" />

            <span className="relative">
              {label}
            </span>
          </a>
        ))}
      </nav>
    </aside>
  );
}

export { Sidebar };
export type { NavigationItem, SidebarProps };