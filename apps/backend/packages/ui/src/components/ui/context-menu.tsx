"use client";

import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/utils";

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

export function ContextMenuContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        className={cn(
          "dx-surface z-[var(--z-dropdown)] min-w-[12rem] rounded-[var(--radius-lg)] border p-1 shadow-[var(--shadow-md)]",
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

export function ContextMenuItem({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item>) {
  return (
    <ContextMenuPrimitive.Item
      className={cn(
        "flex cursor-default items-center rounded-[var(--radius-sm)] px-3 py-2 text-sm outline-none hover:bg-accent",
        className
      )}
      {...props}
    />
  );
}
