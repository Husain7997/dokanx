"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/utils";

export function Checkbox({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded border border-input bg-card text-primary outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <span className="block h-2.5 w-2.5 rounded-sm bg-current" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
