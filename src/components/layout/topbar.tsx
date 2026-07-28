import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type TopbarProps = { title?: string; children?: ReactNode; className?: string };
function Topbar({ title, children, className }: TopbarProps) {
  return <header className={cn("flex h-16 items-center justify-between border-b bg-surface px-5 sm:px-8", className)}>{title && <span className="text-sm font-medium text-foreground">{title}</span>}{children}</header>;
}

export { Topbar };
