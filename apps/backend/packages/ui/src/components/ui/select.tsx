"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-11 w-full items-center justify-between rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm",
        className
      )}
      {...props}
    />
  );
}

export function SelectContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          "dx-surface z-50 min-w-[12rem] overflow-hidden rounded-[var(--radius-lg)] border shadow-[var(--shadow-md)]",
          className
        )}
        {...props}
      />
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-default select-none items-center px-3 py-2 text-sm outline-none hover:bg-accent",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText />
    </SelectPrimitive.Item>
  );
}
