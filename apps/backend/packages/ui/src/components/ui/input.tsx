import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]",
        className
      )}
      {...props}
    />
  );
}
