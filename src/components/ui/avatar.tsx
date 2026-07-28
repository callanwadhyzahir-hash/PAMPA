import type { ComponentProps } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type AvatarProps = ComponentProps<"div"> & { name: string; src?: string; size?: "sm" | "md" | "lg" };
function Avatar({ className, name, src, size = "md", ...props }: AvatarProps) {
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const dimensions = size === "sm" ? 28 : size === "lg" ? 44 : 36;

  return <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-medium text-muted-foreground", { "size-7 text-[10px]": size === "sm", "size-9 text-xs": size === "md", "size-11 text-sm": size === "lg" }, className)} {...props}>{src ? <Image src={src} alt={name} width={dimensions} height={dimensions} unoptimized className="size-full object-cover" /> : initials}</div>;
}
export { Avatar };
