"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import * as SelectPrimitive from "@radix-ui/react-select"

import { cn } from "@/lib/utils"

/**
 * Brutalism-select (tidak mengubah logic)
 * - mempertahankan API Radix / shadcn
 * - menambahkan class brutalism pada trigger, content, item, separator, dsb.
 */

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      // BASE BRUTALISM STYLE for trigger (kept compact & compatible)
      "w-full font-semibold bg-white " +
        "border-2 border-black rounded-xl " +
        "shadow-[3px_3px_0px_#000] " +
        "px-3 py-2 transition-all " +
        "flex items-center justify-between " +
        "gap-2 " +
        // hover
        "hover:-translate-x-[2px] hover:-translate-y-[2px] " +
        "hover:shadow-[5px_5px_0px_#000] " +
        // focus
        "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-black " +
        "focus-visible:shadow-[5px_5px_0px_#000] ",
      className
    )}
    {...props}
  >
    {children}
    <ChevronDown className="h-4 w-4 opacity-70" />
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden bg-white " +
          "border-2 border-black shadow-[4px_4px_0px_#000] rounded-xl " +
          "animate-in fade-in-80 zoom-in-90 ",
        className
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = "SelectContent"

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1 text-xs font-bold", className)}
    {...props}
  />
))
SelectLabel.displayName = "SelectLabel"

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "text-sm px-3 py-2 rounded-md cursor-pointer font-semibold flex items-center justify-between " +
        "hover:bg-yellow-200 focus:bg-yellow-300 focus:outline-none " ,
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="ml-2">
      <Check className="h-4 w-4" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
))
SelectItem.displayName = "SelectItem"

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("my-1 border-t-2 border-black", className)}
    {...props}
  />
))
SelectSeparator.displayName = "SelectSeparator"

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
}