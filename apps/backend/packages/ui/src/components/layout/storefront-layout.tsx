import type { ReactNode } from "react";

import { Navbar } from "../ui/navbar";

export function StorefrontLayout({
  brand,
  actions,
  children
}: {
  brand: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar brand={brand} actions={actions} />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
