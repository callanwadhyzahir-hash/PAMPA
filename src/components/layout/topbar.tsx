import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type TopbarProps = {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
};

function Topbar({ left, right, className }: TopbarProps) {
  return (
    <header
      className={cn(
        "flex h-16 items-center justify-between gap-3 border-b border-phosphor-blue-black bg-background px-4 sm:px-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">{left}</div>
      <div className="flex items-center gap-3">{right}</div>
    </header>
  );
}

export { Topbar };
export type { TopbarProps };
