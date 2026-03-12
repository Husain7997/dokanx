import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";

import { AppShell } from "@dokanx/ui";

import { navigation } from "@/config/navigation";
import { getTenantConfig } from "@/lib/tenant";
import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "DokanX Storefront",
  description: "Storefront shell for DokanX Commerce OS"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const host = (await headers()).get("host") || "localhost:3000";
  const tenant = getTenantConfig(host);

  return (
    <html lang="en">
      <body>
        <AppProviders tenant={tenant}>
          <AppShell appName="Storefront Web" navigation={navigation}>
            {children}
          </AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
