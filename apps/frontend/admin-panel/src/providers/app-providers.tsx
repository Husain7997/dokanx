"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, ToastProvider, ToastRegion } from "@dokanx/ui";

import { AuthProvider } from "@dokanx/auth";
import { getApiBaseUrl } from "@dokanx/utils";

import { createQueryClient } from "@/lib/query-client";
import { ErrorBoundary } from "@/components/error-boundary";
import { getAdminTenantConfig } from "@/lib/tenant";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const tenant = getAdminTenantConfig();

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
