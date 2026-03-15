"use client";

import * as RadioGroup from "@radix-ui/react-radio-group";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/utils";

export const RadioGroupRoot = RadioGroup.Root;

export function RadioGroupItem({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadioGroup.Item>) {
  return (
    <RadioGroup.Item
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-full border border-input bg-card outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]",
        className
      )}
      {...props}
    >
      <RadioGroup.Indicator className="h-2.5 w-2.5 rounded-full bg-primary" />
    </RadioGroup.Item>
  );
}
