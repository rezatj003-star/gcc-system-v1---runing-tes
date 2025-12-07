"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Brutalism-styled Textarea
 * Strong borders, offset shadows, bold font, rounded corners
 */

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // BASE BRUTALISM STYLE
          "w-full font-semibold bg-white " +
            "border-2 border-black rounded-xl " +
            "shadow-[3px_3px_0px_#000] " +
            "px-3 py-2 transition-all resize-none " +
            "placeholder:text-gray-500 " +

            // HOVER
            "hover:-translate-x-[2px] hover:-translate-y-[2px] " +
            "hover:shadow-[5px_5px_0px_#000] " +

            // FOCUS
            "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-black " +
            "focus-visible:shadow-[5px_5px_0px_#000] ",

          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Textarea.displayName = "Textarea"

export { Textarea }