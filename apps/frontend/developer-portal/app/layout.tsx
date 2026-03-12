import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@dokanx/ui";

import { navigation } from "@/config/navigation";
import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "DokanX Developer Portal",
  description: "Developer experience shell for DokanX Commerce OS"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <AppShell appName="Developer Portal" navigation={navigation}>
            {children}
          </AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
