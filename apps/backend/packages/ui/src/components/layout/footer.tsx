import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function Footer({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <footer
      className={cn("border-t bg-card px-6 py-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}
