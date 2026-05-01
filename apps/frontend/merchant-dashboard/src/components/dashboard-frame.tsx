"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ProtectedRoute, RoleGuard, useAuth } from "@dokanx/auth";
import { AppShell } from "@dokanx/ui";

import { agentNavigation, navigation } from "@/config/navigation";
import { filterNavigationByPermissions, getRequiredPermissionForPath, hasPermission } from "@/lib/permissions";

export function DashboardFrame({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const returnTo = encodeURIComponent(pathname || "/");
  const roleName = auth.user?.roleName;
  const requiredPermission = getRequiredPermissionForPath(pathname || "/");
  const baseNavigation = roleName === "agent" ? agentNavigation : navigation;
  const resolvedNavigation = roleName === "agent"
    ? baseNavigation.map(({ href, label }) => ({ href, label }))
    : filterNavigationByPermissions(baseNavigation, auth.user);

  if (pathname.startsWith("/accept-invite") || pathname.startsWith("/sign-in")) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute
      fallback={
        <div className="p-6 text-sm">
          <a href={`/sign-in?returnTo=${returnTo}`}>Merchant authentication required. Sign in to continue.</a>
        </div>
      }
    >
      <RoleGuard
        allow={["merchant", "staff", "admin", "agent"]}
        fallback={
          <div className="p-6 text-sm">
            <a href={`/sign-in?returnTo=${returnTo}`}>You do not have access to this workspace.</a>
          </div>
        }
      >
        {requiredPermission && !hasPermission(auth.user, requiredPermission) ? (
          <div className="p-6 text-sm">You do not have permission to access this page.</div>
        ) : (
          <AppShell
            appName={roleName === "agent" ? "Agent Panel" : "Merchant Dashboard"}
            navigation={resolvedNavigation}
          >
            {children}
          </AppShell>
        )}
      </RoleGuard>
    </ProtectedRoute>
  );
}