"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, ToastProvider, ToastRegion } from "@dokanx/ui";

import { AuthProvider } from "@dokanx/auth";
import { getApiBaseUrl } from "@dokanx/utils";
import type { TenantConfig } from "@dokanx/types";

import { createQueryClient } from "@/lib/query-client";

const developerTenant: TenantConfig = {
  id: "developer-portal",
  slug: "developer-portal",
  name: "Developer Portal",
  currency: "BDT",
  language: "en",
  theme: "storefront-theme",
  logo: null
};

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider defaultTheme={developerTenant.theme}>
      <ToastProvider>
        <AuthProvider baseUrl={getApiBaseUrl()} tenant={developerTenant}>
          <QueryClientProvider client={queryClient}>
            <ToastRegion>{children}</ToastRegion>
          </QueryClientProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
