"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ProtectedRoute, RoleGuard } from "@dokanx/auth";
import { AppShell } from "@dokanx/ui";

import { navigation } from "@/config/navigation";

export function DashboardFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/accept-invite") || pathname.startsWith("/sign-in")) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute fallback={<div className="p-6 text-sm"><a href="/sign-in">Merchant authentication required.</a></div>}>
      <RoleGuard
        allow={["merchant", "staff", "admin"]}
        fallback={<div className="p-6 text-sm"><a href="/sign-in">You do not have access to this workspace.</a></div>}
      >
        <AppShell appName="Merchant Dashboard" navigation={navigation}>
          {children}
        </AppShell>
      </RoleGuard>
    </ProtectedRoute>
  );
}
