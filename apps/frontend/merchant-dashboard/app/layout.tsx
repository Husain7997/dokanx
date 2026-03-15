import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Serif_Display, Space_Grotesk } from "next/font/google";

import { AppProviders } from "@/providers/app-providers";
import { DashboardFrame } from "@/components/dashboard-frame";

import "./globals.css";

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DokanX Merchant Dashboard",
  description: "Merchant dashboard shell for DokanX Commerce OS"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        <AppProviders>
          <DashboardFrame>{children}</DashboardFrame>
        </AppProviders>
      </body>
    </html>
  );
}
