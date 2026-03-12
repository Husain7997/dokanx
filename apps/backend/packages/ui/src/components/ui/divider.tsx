"use client";

import * as Separator from "@radix-ui/react-separator";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/utils";

export function Divider({
  className,
  orientation = "horizontal",
  ...props
}: ComponentPropsWithoutRef<typeof Separator.Root>) {
  return (
    <Separator.Root
      decorative
      orientation={orientation}
      className={cn(
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        "bg-border",
        className
      )}
      {...props}
    />
  );
}
