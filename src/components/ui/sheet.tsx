"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Sheet({ ...props }: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetOverlay({ className, ...props }: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-void-black/60 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

const sheetAnimation = "data-open:animate-in data-closed:animate-out data-closed:duration-200"
const sheetSideClasses = {
  right: `inset-y-0 right-0 h-full w-3/4 border-l ${sheetAnimation} data-open:slide-in-from-right data-closed:slide-out-to-right sm:max-w-sm`,
  left: `inset-y-0 left-0 h-full w-3/4 border-r ${sheetAnimation} data-open:slide-in-from-left data-closed:slide-out-to-left sm:max-w-sm`,
  top: `inset-x-0 top-0 h-auto border-b ${sheetAnimation} data-open:slide-in-from-top data-closed:slide-out-to-top`,
  bottom: `inset-x-0 bottom-0 h-auto border-t ${sheetAnimation} data-open:slide-in-from-bottom data-closed:slide-out-to-bottom`,
} as const

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: DrawerPrimitive.Popup.Props & {
  side?: keyof typeof sheetSideClasses
  showCloseButton?: boolean
}) {
  return (
    <DrawerPrimitive.Portal>
      <SheetOverlay />
      <DrawerPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col gap-4 border-border bg-popover p-4 text-popover-foreground shadow-lg outline-none duration-200",
          sheetSideClasses[side],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DrawerPrimitive.Close
            data-slot="sheet-close"
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon" />}
          >
            <XIcon />
            <span className="sr-only">Cerrar</span>
          </DrawerPrimitive.Close>
        ) : null}
      </DrawerPrimitive.Popup>
    </DrawerPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-display text-subheading font-medium text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
