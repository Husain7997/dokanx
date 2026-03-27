import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Header({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <header
      className={cn("flex items-center justify-between border-b bg-card px-6 py-4", className)}
      {...props}
    />
  );
}
