import type { ReactNode } from "react";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

export type TopNavItem = {
  label: string;
  onClick?: () => void;
  href?: string;
};

export function TopNavigation({
  logo,
  items,
  actions,
  className
}: {
  logo: ReactNode;
  items: TopNavItem[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-6 border-b bg-card px-6 py-4",
        className
      )}
    >
      <div className="flex items-center gap-4">{logo}</div>
      <nav className="flex flex-1 items-center gap-3 text-sm text-muted-foreground">
        {items.map((item) =>
          item.href ? (
            <a key={item.label} href={item.href} className="hover:text-foreground">
              {item.label}
            </a>
          ) : (
            <Button
              key={item.label}
              type="button"
              variant="ghost"
              className="px-3 py-1 text-sm"
              onClick={item.onClick}
            >
              {item.label}
            </Button>
          )
        )}
      </nav>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </header>
  );
}
