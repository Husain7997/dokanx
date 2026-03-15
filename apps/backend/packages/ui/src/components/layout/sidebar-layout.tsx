import type { ReactNode } from "react";

import { Sidebar, type SidebarItem } from "./sidebar";

export function SidebarLayout({
  sidebarTitle,
  sidebarItems,
  children
}: {
  sidebarTitle: string;
  sidebarItems: SidebarItem[];
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen gap-4 bg-background p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar title={sidebarTitle} items={sidebarItems} />
      <main>{children}</main>
    </div>
  );
}
