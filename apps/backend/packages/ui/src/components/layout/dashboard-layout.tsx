import type { ReactNode } from "react";

import { Sidebar, type SidebarItem } from "./sidebar";
import { Topbar } from "./topbar";

export function DashboardLayout({
  title,
  subtitle,
  sidebarItems,
  actions,
  children
}: {
  title: string;
  subtitle?: string;
  sidebarItems: SidebarItem[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar title={title} items={sidebarItems} />
        <main className="grid gap-6">
          <Topbar title={title} subtitle={subtitle} actions={actions} />
          {children}
        </main>
      </div>
    </div>
  );
}
