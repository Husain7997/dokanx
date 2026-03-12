"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex rounded-[var(--radius-md)] bg-accent p-1 text-accent-foreground",
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-[calc(var(--radius-md)-2px)] px-3 py-2 text-sm transition data-[state=active]:bg-card data-[state=active]:shadow-[var(--shadow-sm)]",
        className
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
