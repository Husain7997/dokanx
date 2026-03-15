import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Serif_Display, Space_Grotesk } from "next/font/google";
import Link from "next/link";

import { AppProviders } from "@/providers/app-providers";
import { adminNavigation } from "@/config/navigation";

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
  title: "DokanX Admin Control",
  description: "Admin control plane for DokanX Commerce OS"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        <AppProviders>
          <div className="dx-shell min-h-screen">
            <div className="dx-shell-inner flex min-h-screen">
              <aside className="dx-shell-sidebar hidden w-64 flex-col gap-6 border-r border-white/40 p-6 lg:flex">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
                  <h1 className="dx-display text-2xl">Control Desk</h1>
                </div>
                <nav className="flex flex-col gap-2">
                  {adminNavigation.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="dx-shell-link rounded-xl px-4 py-3 text-sm font-semibold"
                    >
                      <span className="block text-foreground">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </Link>
                  ))}
                </nav>
              </aside>
              <main className="flex flex-1 flex-col">
                <div className="dx-shell-topbar flex items-center justify-between border-b border-white/40 px-6 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Platform</p>
                    <h2 className="dx-display text-xl">DokanX Admin</h2>
                  </div>
                  <div className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-foreground">
                    System Ready
                  </div>
                </div>
                <div className="dx-shell-content flex-1 p-6">{children}</div>
              </main>
            </div>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
