import type { ReactNode } from "react";

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
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        <aside className="border-b border-border md:w-72 md:border-b-0 md:border-r">
          <div className="px-6 py-5">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              DokanX
            </p>
            <h1 className="mt-2 text-2xl font-semibold">{appName}</h1>
          </div>
          <nav className="grid gap-1 px-3 pb-6">
            {navigation.map((item) => (
              <a
                key={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                )}
                href={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>
        <main className="flex-1">
          <div className="border-b border-border px-6 py-4">
            <p className="text-sm text-muted-foreground">Architecture scaffold</p>
          </div>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
