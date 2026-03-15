import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Serif_Display, Space_Grotesk } from "next/font/google";
import Link from "next/link";

import { AppProviders } from "@/providers/app-providers";
import { developerNavigation } from "@/config/navigation";

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
  title: "DokanX Developer Portal",
  description: "Developer experience hub for DokanX Commerce OS"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        <AppProviders>
          <div className="dx-portal min-h-screen">
            <div className="dx-portal-inner mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-10">
              <header className="flex flex-col gap-4 rounded-3xl border border-white/40 bg-white/70 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Developer Portal</p>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="dx-display text-3xl">Build on DokanX</h1>
                    <p className="text-sm text-muted-foreground">
                      API references, sandbox tools, and integration guides.
                    </p>
                  </div>
                  <nav className="flex flex-wrap gap-2">
                    {developerNavigation.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-semibold"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              </header>
              <main className="grid gap-6">{children}</main>
            </div>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
