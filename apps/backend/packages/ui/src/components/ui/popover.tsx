"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={10}
        className={cn(
          "dx-surface z-[var(--z-dropdown)] w-72 rounded-[var(--radius-lg)] border p-4 shadow-[var(--shadow-md)]",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
