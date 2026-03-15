"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={8}
        className={cn(
          "z-[var(--z-dropdown)] rounded-[var(--radius-sm)] bg-foreground px-2.5 py-1.5 text-xs text-background shadow-[var(--shadow-md)]",
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
