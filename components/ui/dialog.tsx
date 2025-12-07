"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger(
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>
) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal(
  props: React.ComponentProps<typeof DialogPrimitive.Portal>
) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose(
  props: React.ComponentProps<typeof DialogPrimitive.Close>
) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/40",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          // BRUTALISM STYLE
          "fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] " +
            "bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0px_#000] " +
            "p-6 z-50 w-full max-w-lg",

          className
        )}
        {...props}
      >
        {children}

        {showCloseButton && (
          <DialogPrimitive.Close className="absolute top-4 right-4 border-2 border-black p-1 rounded-lg shadow-[2px_2px_0px_#000] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all">
            <XIcon className="h-4 w-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader(props: React.ComponentProps<"div">) {
  return <div className="flex flex-col gap-2 text-left" {...props} />
}

function DialogFooter(props: React.ComponentProps<"div">) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-end gap-2" {...props} />
  )
}

function DialogTitle(
  props: React.ComponentProps<typeof DialogPrimitive.Title>
) {
  return (
    <DialogPrimitive.Title className="text-xl font-black" {...props} />
  )
}

function DialogDescription(
  props: React.ComponentProps<typeof DialogPrimitive.Description>
) {
  return (
    <DialogPrimitive.Description
      className="text-sm opacity-80"
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogOverlay,
  DialogClose,
  DialogPortal,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}