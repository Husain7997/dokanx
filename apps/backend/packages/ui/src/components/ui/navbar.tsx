import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

export function Navbar({
  brand,
  actions,
  children,
  className
}: {
  brand: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("dx-surface sticky top-0 z-[var(--z-sticky)] border-b", className)}>
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">{brand}{children}</div>
        {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
      </div>
    </header>
  );
}
