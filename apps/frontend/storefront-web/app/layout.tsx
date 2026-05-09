import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";

import { AppShell, LanguageToggle } from "@dokanx/ui";

import { landingNavigation, navigation } from "@/config/navigation";
import { getTenantConfig } from "@/lib/tenant";
import { AppProviders } from "@/providers/app-providers";
import { getStorefrontShopByHost, getStorefrontThemeByHost } from "@/lib/server-data";
import { getPublicSurface } from "@/lib/surface";
import { StorefrontThemeProvider } from "@/components/storefront-theme-provider";
import { ThemeExperimentCookieSeed } from "@/components/theme-experiment-cookie-seed";
import { FloatingCartButton } from "@/components/floating-cart-button";

import "./globals.css";

export const metadata: Metadata = {
  title: "DokanX Storefront",
  description: "Storefront shell for DokanX Commerce OS",
  icons: {
    icon: "/assets/logo/icon.svg",
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const host = (await headers()).get("host") || "localhost:3000";
  const tenant = getTenantConfig(host);
  const variantCookie = (await cookies()).get("dx_theme_variant")?.value || null;
  const [storefrontTheme, storefrontShop] = await Promise.all([
    getStorefrontThemeByHost(host, variantCookie),
    getStorefrontShopByHost(host),
  ]);
  const surface = getPublicSurface(host, Boolean(storefrontShop));
  const isStorefront = surface === "shop" || surface === "marketplace";

  return (
    <html lang="en">
      <body className="antialiased">
        <AppProviders tenant={tenant}>
          <StorefrontThemeProvider theme={storefrontTheme}>
            <ThemeExperimentCookieSeed />
            <AppShell appName={surface === "merchant-landing" ? "DokanX Merchant" : "DokanX"} navigation={isStorefront ? navigation : landingNavigation} topbarAction={<LanguageToggle />}>
              {children}
            </AppShell>
            <FloatingCartButton />
          </StorefrontThemeProvider>
        </AppProviders>
      </body>
    </html>
  );
}
