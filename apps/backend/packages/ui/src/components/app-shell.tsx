import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "../lib/utils";

export type NavigationItem = {
  href: string;
  label: string;
};

type AppShellProps = {
  appName: string;
  navigation: NavigationItem[];
  children: ReactNode;
};

export function AppShell({ appName, navigation, children }: AppShellProps) {
  return (
    <div className="dx-shell min-h-screen bg-background text-foreground">
      <div className="dx-shell-inner mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="dx-shell-sidebar border-b border-border lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:w-72 lg:flex-col lg:border-b-0 lg:border-r">
          <div className="px-4 py-4 sm:px-6 lg:px-6 lg:py-5">
            <p className="dx-shell-brand text-xs uppercase tracking-[0.3em] text-muted-foreground">
              DokanX
            </p>
            <div className="mt-2 flex items-center justify-between gap-3 lg:block">
              <h1 className="dx-shell-title text-xl font-semibold sm:text-2xl">{appName}</h1>
              <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground lg:hidden">
                {navigation.length} sections
              </span>
            </div>
          </div>
          <nav className="dx-shell-nav flex gap-2 overflow-x-auto px-3 pb-4 scrollbar-none lg:grid lg:gap-1 lg:px-3 lg:pb-6">
            {navigation.map((item) => (
              <Link
                key={item.href}
                className={cn(
                  "dx-shell-link shrink-0 rounded-xl border border-transparent px-4 py-3 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground lg:w-full"
                )}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="dx-shell-main min-w-0 flex-1">
          <div className="dx-shell-topbar sticky top-0 z-20 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
                <p className="truncate text-sm font-medium text-foreground sm:text-base">{appName}</p>
              </div>
              <div className="rounded-full border border-border bg-card/85 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                Live session
              </div>
            </div>
          </div>
          <div className="dx-shell-content px-4 py-4 sm:px-6 sm:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
