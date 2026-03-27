import { cn } from "../../lib/utils";

export type SidebarItem = {
  label: string;
  href?: string;
  active?: boolean;
};

export function SidebarNavigation({
  title,
  items,
  className
}: {
  title?: string;
  items: SidebarItem[];
  className?: string;
}) {
  return (
    <aside className={cn("w-64 border-r bg-card px-4 py-6", className)}>
      {title ? <p className="mb-4 text-xs font-semibold uppercase text-muted-foreground">{title}</p> : null}
      <nav className="space-y-2">
        {items.map((item) => (
          <a
            key={item.label}
            href={item.href ?? "#"}
            className={cn(
              "block rounded-[var(--radius-md)] px-3 py-2 text-sm transition",
              item.active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
