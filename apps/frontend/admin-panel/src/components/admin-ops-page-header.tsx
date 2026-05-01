"use client";

import { Button } from "@dokanx/ui";

type ActionLink = {
  href: string;
  label: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
};

type AdminOpsPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  tone?: "default" | "dark";
  refreshLabel?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  actions?: ActionLink[];
};

export function AdminOpsPageHeader({
  eyebrow = "Admin",
  title,
  description,
  tone = "default",
  refreshLabel = "Refresh",
  onRefresh,
  refreshing = false,
  actions = [],
}: AdminOpsPageHeaderProps) {
  const isDark = tone === "dark";

  return (
    <div
      className={
        isDark
          ? "rounded-[28px] border border-white/10 bg-[#102446] px-6 py-6 text-white shadow-[0_24px_60px_rgba(14,22,44,0.22)]"
          : "rounded-[28px] border border-border/70 bg-card/92 px-6 py-6 shadow-sm"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          <p className={isDark ? "text-xs uppercase tracking-[0.24em] text-[#FFD49F]" : "text-xs uppercase tracking-[0.2em] text-muted-foreground"}>
            {eyebrow}
          </p>
          <h1 className="dx-display text-3xl">{title}</h1>
          <p className={isDark ? "text-sm text-slate-200" : "text-sm text-muted-foreground"}>{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {onRefresh ? (
            <Button variant={isDark ? "secondary" : "primary"} onClick={onRefresh} disabled={refreshing}>
              {refreshing ? "Refreshing..." : refreshLabel}
            </Button>
          ) : null}
          {actions.map((action) => (
            <Button
              key={`${action.href}-${action.label}`}
              asChild
              variant={action.variant === "ghost" ? "ghost" : action.variant === "outline" ? "outline" : action.variant === "secondary" ? "secondary" : "secondary"}
            >
              <a href={action.href}>{action.label}</a>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
