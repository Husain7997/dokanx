"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/utils";

export const Dropdown = DropdownMenu.Root;
export const DropdownTrigger = DropdownMenu.Trigger;

export function DropdownContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        className={cn(
          "dx-surface z-50 min-w-[12rem] rounded-[var(--radius-lg)] border p-1 shadow-[var(--shadow-md)]",
          className
        )}
        sideOffset={8}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

export function DropdownItem({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenu.Item>) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex cursor-default items-center rounded-[var(--radius-sm)] px-3 py-2 text-sm outline-none hover:bg-accent",
        className
      )}
      {...props}
    />
  );
}
