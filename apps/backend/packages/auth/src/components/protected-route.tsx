"use client";

import type { ReactNode } from "react";

import { useAuth } from "../provider";

export function ProtectedRoute({
  children,
  fallback = null
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const auth = useAuth();

  if (auth.status === "restoring") {
    return null;
  }

  if (auth.status !== "authenticated") {
    return null;
  }

  return <>{children}</>;
}
