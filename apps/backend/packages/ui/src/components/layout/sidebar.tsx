import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "../../lib/utils";

export type SidebarItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
};

export function Sidebar({
  title,
  items,
  footer,
  className
}: {
  title: string;
  items: SidebarItem[];
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <aside className={cn("dx-surface flex h-full flex-col rounded-[var(--radius-xl)] border p-4", className)}>
      <div className="px-3 py-2">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">DokanX</p>
        <h2 className="mt-2 text-lg font-semibold">{title}</h2>
      </div>
      <nav className="mt-6 grid gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm transition",
              item.active
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-sm)]"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      {footer ? <div className="mt-auto pt-4">{footer}</div> : null}
    </aside>
  );
}