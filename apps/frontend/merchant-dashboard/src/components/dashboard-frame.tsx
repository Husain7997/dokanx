"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ProtectedRoute, RoleGuard, useAuth } from "@dokanx/auth";
import { AppShell, LanguageToggle, translateLabel, useDokanxLanguage } from "@dokanx/ui";

import { agentNavigation, navigation } from "@/config/navigation";
import { filterNavigationByPermissions, getRequiredPermissionForPath, hasPermission } from "@/lib/permissions";

export function DashboardFrame({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [loadingError, setLoadingError] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const returnTo = encodeURIComponent(pathname || "/");
  const roleName = auth.user?.roleName;
  const { language } = useDokanxLanguage();
  const requiredPermission = getRequiredPermissionForPath(pathname || "/");
  const baseNavigation = roleName === "agent" ? agentNavigation : navigation;
  const resolvedNavigation = roleName === "agent"
    ? baseNavigation.map(({ href, label }) => ({ href, label: translateLabel(label, language) }))
    : filterNavigationByPermissions(baseNavigation, auth.user).map((item) => ({
      ...item,
      label: translateLabel(item.label, language),
    }));

  const isPublicEntry =
    pathname === "/" ||
    pathname.startsWith("/accept-invite") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register");

  useEffect(() => {
    if (isPublicEntry) return;
    if (auth.status === "restoring") return;
    if (!auth.user) {
      router.replace(`/login?returnTo=${returnTo}`);
      return;
    }
    if (!["merchant", "agent"].includes(String(auth.user.roleName || ""))) {
      router.replace(`/login?returnTo=${returnTo}`);
    }
  }, [auth.status, auth.user, isPublicEntry, returnTo, router]);

  useEffect(() => {
    if (auth.status !== "restoring") {
      setLoadingError(false);
      return;
    }
    const timer = window.setTimeout(() => setLoadingError(true), 5000);
    return () => window.clearTimeout(timer);
  }, [auth.status]);

  if (isPublicEntry) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute
      fallback={
        <div className="p-6 text-sm">
          {auth.status === "restoring" && !loadingError ? "Loading merchant workspace..." : (
            <a href={`/login?returnTo=${returnTo}`}>{loadingError ? "Loading failed. Sign in again." : "Merchant authentication required. Sign in to continue."}</a>
          )}
        </div>
      }
    >
      <RoleGuard
        allow={["merchant", "agent"]}
        fallback={
          <div className="p-6 text-sm">
            <a href={`/login?returnTo=${returnTo}`}>You do not have access to this workspace.</a>
          </div>
        }
      >
        {requiredPermission && !hasPermission(auth.user, requiredPermission) ? (
          <div className="p-6 text-sm">You do not have permission to access this page.</div>
        ) : (
          <AppShell
            appName={roleName === "agent" ? "Agent Panel" : "Merchant Dashboard"}
            navigation={resolvedNavigation}
            topbarAction={<LanguageToggle />}
          >
            {children}
          </AppShell>
        )}
      </RoleGuard>
    </ProtectedRoute>
  );
}
