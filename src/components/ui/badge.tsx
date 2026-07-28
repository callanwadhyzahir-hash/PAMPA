import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", { variants: { variant: { default: "bg-secondary text-foreground", success: "bg-green-50 text-success", warning: "bg-amber-50 text-warning", danger: "bg-red-50 text-danger", info: "bg-blue-50 text-primary" } }, defaultVariants: { variant: "default" } });
function Badge({ className, variant, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) { return <span className={cn(badgeVariants({ variant, className }))} {...props} />; }
export { Badge, badgeVariants };
