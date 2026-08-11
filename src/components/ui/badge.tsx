import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      // Generic neutral solid chip.
      default: "bg-secondary text-foreground",
      // Transparent + hairline border — for low-emphasis states.
      neutral: "border border-border bg-transparent text-muted-foreground",
      // Lime is reserved for a genuinely active/selected state, never decorative.
      active: "bg-primary/15 text-primary",
      success: "bg-success-bg text-success",
      warning: "bg-warning-bg text-warning",
      danger: "bg-destructive-bg text-destructive",
      info: "bg-information-bg text-information",
    },
  },
  defaultVariants: { variant: "default" },
});
function Badge({ className, variant, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) { return <span className={cn(badgeVariants({ variant, className }))} {...props} />; }
export { Badge, badgeVariants };
