"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, ToastProvider, ToastRegion } from "@dokanx/ui";

import { AuthProvider } from "@dokanx/auth";
import type { TenantConfig } from "@dokanx/types";
import { getApiBaseUrl } from "@dokanx/utils";

import { createQueryClient } from "@/lib/query-client";
import { ErrorBoundary } from "@/components/error-boundary";

export function AppProviders({
  children,
  tenant
}: {
  children: ReactNode;
  tenant: TenantConfig;
}) {
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider defaultTheme={tenant.theme}>
      <ToastProvider>
        <AuthProvider baseUrl={getApiBaseUrl()} tenant={tenant}>
          <QueryClientProvider client={queryClient}>
            <ErrorBoundary>
              <ToastRegion>{children}</ToastRegion>
            </ErrorBoundary>
          </QueryClientProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
