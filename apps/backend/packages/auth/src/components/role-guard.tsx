"use client";

import type { ReactNode } from "react";

import type { AuthRole } from "@dokanx/types";

import { useAuth } from "../provider";

export function RoleGuard({
  allow,
  children,
  fallback = null
}: {
  allow: AuthRole[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const auth = useAuth();

  if (!auth.hasRole(...allow)) {
    return fallback;
  }

  return <>{children}</>;
}
