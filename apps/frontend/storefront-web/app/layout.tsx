import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { Fraunces, Sora } from "next/font/google";

import { AppShell } from "@dokanx/ui";

import { navigation } from "@/config/navigation";
import { getTenantConfig } from "@/lib/tenant";
import { AppProviders } from "@/providers/app-providers";
import { getStorefrontThemeByHost } from "@/lib/server-data";
import { StorefrontThemeProvider } from "@/components/storefront-theme-provider";
import { ThemeExperimentCookieSeed } from "@/components/theme-experiment-cookie-seed";

import "./globals.css";

const sans = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DokanX Storefront",
  description: "Storefront shell for DokanX Commerce OS"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const host = (await headers()).get("host") || "localhost:3000";
  const tenant = getTenantConfig(host);
  const variantCookie = (await cookies()).get("dx_theme_variant")?.value || null;
  const storefrontTheme = await getStorefrontThemeByHost(host, variantCookie);

  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        <AppProviders tenant={tenant}>
          <StorefrontThemeProvider theme={storefrontTheme}>
            <ThemeExperimentCookieSeed />
            <AppShell appName="Storefront Web" navigation={navigation}>
              {children}
            </AppShell>
          </StorefrontThemeProvider>
        </AppProviders>
      </body>
    </html>
  );
}
