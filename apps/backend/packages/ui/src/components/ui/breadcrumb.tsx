import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumb({
  items,
  separator = "/",
  className
}: {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.href ? <a href={item.href} className="hover:text-foreground">{item.label}</a> : <span className="text-foreground">{item.label}</span>}
            {index < items.length - 1 ? <span>{separator}</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
