import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  { variants: { variant: { default: "bg-primary text-primary-foreground hover:bg-[#1d4ed8]", outline: "border bg-surface text-foreground hover:bg-muted", secondary: "bg-secondary text-foreground hover:bg-[#e5e7eb]", ghost: "text-muted-foreground hover:bg-muted hover:text-foreground", destructive: "bg-destructive text-white hover:bg-[#b91c1c]", link: "text-primary hover:text-[#1d4ed8]" }, size: { sm: "h-8 px-3 text-xs", default: "h-9 px-4", lg: "h-10 px-5", icon: "size-9" } }, defaultVariants: { variant: "default", size: "default" } }
);

function Button({ className, variant, size, ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
