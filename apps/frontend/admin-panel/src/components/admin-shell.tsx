"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@dokanx/auth";
import { Logo } from "@dokanx/ui";

import { adminNavigation } from "@/config/navigation";
import { filterAdminNavigation, getAdminRequiredPermission, hasAdminPagePermission } from "@/lib/permissions";

export function AdminShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const visibleNavigation = filterAdminNavigation(adminNavigation, auth.user);
  const requiredPermission = getAdminRequiredPermission(pathname || "/dashboard");

  return (
    <div className="dx-shell min-h-screen">
      <div className="dx-shell-inner flex min-h-screen flex-col lg:flex-row">
        <aside className="dx-shell-sidebar border-b border-border/70 lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
          <div className="px-4 py-4 sm:px-6 lg:p-6">
            <div className="rounded-[28px] border border-border/70 bg-card/90 p-3 shadow-[var(--shadow-sm)]">
              <Logo variant="full" size="md" className="max-w-full" />
              <div className="mt-3 flex items-center justify-between gap-3 lg:block">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
                  <h1 className="dx-display mt-2 text-xl sm:text-2xl">Control Desk</h1>
                </div>
                <span className="rounded-full border border-border/80 bg-background/70 px-3 py-1 text-[11px] font-semibold text-foreground lg:hidden">
                  {visibleNavigation.length} sections
                </span>
              </div>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-3 pb-4 scrollbar-none lg:flex-col lg:gap-2 lg:px-4 lg:pb-6">
            {visibleNavigation.map((item) => (
              <Link key={item.href} href={item.href} className="dx-shell-link shrink-0 rounded-xl px-4 py-3 text-sm font-semibold lg:w-full">
                <span className="block text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="dx-shell-topbar sticky top-0 z-20 border-b border-border/70 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-2xl border border-[#17345f] bg-[#0B1E3C] shadow-[var(--shadow-sm)] p-1.5">
                  <Logo variant="icon" size="sm" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Platform</p>
                  <h2 className="dx-display truncate text-lg sm:text-xl">DokanX Admin</h2>
                </div>
              </div>
              <div className="rounded-full bg-card/90 px-3 py-1 text-xs font-semibold text-foreground shadow-[var(--shadow-sm)]">
                {auth.user?.role || "ADMIN"}
              </div>
            </div>
          </div>
          <div className="dx-shell-content flex-1 px-4 py-4 sm:px-6 sm:py-6">
            {requiredPermission && !hasAdminPagePermission(auth.user, requiredPermission) ? (
              <div className="rounded-3xl border border-border/70 bg-card/90 p-6 text-sm text-muted-foreground">
                Your role does not include access to this admin section.
              </div>
            ) : children}
          </div>
        </main>
      </div>
    </div>
  );
}