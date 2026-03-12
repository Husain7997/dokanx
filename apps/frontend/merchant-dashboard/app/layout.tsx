import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ProtectedRoute, RoleGuard } from "@dokanx/auth";
import { AppShell } from "@dokanx/ui";

import { navigation } from "@/config/navigation";
import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "DokanX Merchant Dashboard",
  description: "Merchant dashboard shell for DokanX Commerce OS"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <ProtectedRoute fallback={<div className="p-6 text-sm">Merchant authentication required.</div>}>
            <RoleGuard
              allow={["merchant", "staff", "admin"]}
              fallback={<div className="p-6 text-sm">You do not have access to this workspace.</div>}
            >
              <AppShell appName="Merchant Dashboard" navigation={navigation}>
                {children}
              </AppShell>
            </RoleGuard>
          </ProtectedRoute>
        </AppProviders>
      </body>
    </html>
  );
}
