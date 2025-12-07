"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Brutalism button styles merged with shadcn/ui variants.
 * Borders, shadows, rounded corners, bold font, and offset hover effect.
 */
const buttonVariants = cva(
  // Base brutalism button
  "inline-flex items-center justify-center whitespace-nowrap font-bold transition-all select-none " +
    "border-2 border-black rounded-xl shadow-[3px_3px_0px_#000] " +
    "bg-yellow-300 hover:-translate-x-[3px] hover:-translate-y-[3px] hover:shadow-[5px_5px_0px_#000] " +
    "active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_#000] ",

  {
    variants: {
      variant: {
        default: "bg-yellow-300 text-black",

        destructive:
          "bg-red-400 text-black hover:bg-red-300 hover:shadow-[5px_5px_0px_#000]",

        outline:
          "bg-white text-black border-2 border-black hover:bg-gray-100",

        secondary:
          "bg-blue-300 text-black hover:bg-blue-200",

        ghost:
          "bg-transparent shadow-none border-none hover:bg-gray-200",

        link: "bg-transparent underline text-black shadow-none border-none px-0 hover:text-blue-700",
      },

      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-6",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }