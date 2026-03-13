import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "@/providers/app-providers";
import { DashboardFrame } from "@/components/dashboard-frame";

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
          <DashboardFrame>{children}</DashboardFrame>
        </AppProviders>
      </body>
    </html>
  );
}
