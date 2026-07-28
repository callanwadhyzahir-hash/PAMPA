import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function PageContainer({ className, ...props }: ComponentProps<"main">) {
  return <main className={cn("mx-auto w-full max-w-[1440px] px-5 py-6 sm:px-8 sm:py-8", className)} {...props} />;
}

export { PageContainer };
