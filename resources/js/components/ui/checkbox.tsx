import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check, Minus } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "group peer size-4 shrink-0 rounded-[4px] border-[1.5px] border-slate-400 bg-white shadow-2xs transition-all outline-none",
        "hover:border-blue-600 dark:hover:border-blue-400",
        "focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 focus-visible:border-blue-600 dark:focus-visible:border-blue-400 dark:focus-visible:ring-offset-slate-950",
        "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white",
        "data-[state=indeterminate]:bg-blue-600 data-[state=indeterminate]:border-blue-600 data-[state=indeterminate]:text-white",
        "dark:border-slate-500 dark:bg-slate-900",
        "dark:data-[state=checked]:bg-blue-500 dark:data-[state=checked]:border-blue-500 dark:data-[state=checked]:text-white",
        "dark:data-[state=indeterminate]:bg-blue-500 dark:data-[state=indeterminate]:border-blue-500 dark:data-[state=indeterminate]:text-white",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-400 dark:disabled:hover:border-slate-500",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <Check className="size-3.5 stroke-[3] text-white group-data-[state=indeterminate]:hidden" />
        <Minus className="size-3.5 stroke-[3] text-white hidden group-data-[state=indeterminate]:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
