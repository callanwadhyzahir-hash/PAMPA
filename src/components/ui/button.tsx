import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      // "default" is the neutral ERP button (Ground Iron + hairline border) —
      // Lime Pulse is reserved for the single dominant action per view, use
      // variant="lime" explicitly for that.
      variant: {
        default: "border border-border bg-card text-foreground hover:bg-secondary",
        lime: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-border bg-transparent text-foreground hover:bg-secondary/60",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-primary hover:text-primary/80 underline-offset-4 hover:underline",
      },
      size: { sm: "h-8 px-3 text-xs", default: "h-9 px-4", lg: "h-10 px-5", icon: "size-9" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function Button({ className, variant, size, ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
