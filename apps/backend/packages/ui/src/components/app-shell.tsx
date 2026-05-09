"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CreditCard,
  Home,
  Megaphone,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  User,
  Wallet
} from "lucide-react";

import { cn } from "../lib/utils";
import { Logo } from "./ui/logo";

export type NavigationItem = {
  href: string;
  label: string;
  target?: string;
};

type AppShellProps = {
  appName: string;
  navigation: NavigationItem[];
  children: ReactNode;
  topbarAction?: ReactNode;
};

const navigationIcons: Record<string, LucideIcon> = {
  Analytics: BarChart3,
  Apps: Boxes,
  Customers: User,
  Dashboard: Home,
  Finance: Wallet,
  Home,
  Inventory: Boxes,
  Marketing: Megaphone,
  Notifications: Bell,
  Orders: ShoppingCart,
  Payments: CreditCard,
  POS: ShoppingCart,
  Products: Package,
  Profile: User,
  Search,
  Settings,
  Shipping: Truck,
  Shops: Building2,
  Wallet,
};

function resolveNavigationIcon(label: string) {
  return navigationIcons[label] || Package;
}

export function AppShell({ appName, navigation, children, topbarAction }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileBase = appName.toLowerCase().includes("merchant") || appName.toLowerCase().includes("agent") ? "" : "/me";

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("dokanx.sidebar") === "collapsed");
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("dokanx.sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  return (
    <div className="dx-shell min-h-screen bg-background text-foreground">
      <div className="dx-shell-inner mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className={`dx-shell-sidebar border-b border-border transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r ${collapsed ? "lg:w-24" : "lg:w-72"}`}>
          <div className="px-4 py-4 sm:px-6 lg:px-6 lg:py-5">
            <div className="rounded-[28px] border border-border/70 bg-card/90 p-3 shadow-[var(--shadow-sm)]">
              <Logo variant={collapsed ? "icon" : "full"} size="md" className="max-w-full" />
              <div className="mt-2 flex items-center justify-between gap-3 lg:block">
                <div className={collapsed ? "lg:hidden" : ""}>
                  <p className="dx-shell-brand text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Commerce OS
                  </p>
                  <h1 className="dx-shell-title mt-2 text-xl font-semibold text-foreground sm:text-2xl">{appName}</h1>
                </div>
                <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground lg:hidden">
                  {navigation.length} sections
                </span>
              </div>
              <button
                type="button"
                className="mt-3 hidden w-full rounded-xl border border-border bg-background/80 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground lg:block"
                onClick={toggleSidebar}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                  <span className={collapsed ? "sr-only" : ""}>{collapsed ? "Expand" : "Collapse"}</span>
                </span>
              </button>
            </div>
          </div>
          <nav className="dx-shell-nav flex gap-2 overflow-x-auto px-3 pb-4 scrollbar-none lg:grid lg:flex-1 lg:content-start lg:gap-1 lg:overflow-x-hidden lg:overflow-y-auto lg:px-3 lg:pb-6">
            {navigation.map((item) => {
              const Icon = resolveNavigationIcon(item.label);
              return (
                <Link
                  key={item.href}
                  className={cn(
                    "dx-shell-link inline-flex min-h-11 shrink-0 items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground lg:w-full",
                    collapsed && "lg:justify-center lg:px-3"
                  )}
                  href={item.href}
                  target={item.target}
                  rel={item.target === "_blank" ? "noreferrer" : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="dx-shell-main min-w-0 flex-1">
          <div className="dx-shell-topbar sticky top-0 z-20 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-2xl border border-[#17345f] bg-[#0B1E3C] shadow-[var(--shadow-sm)] p-1.5">
                  <Logo variant="icon" size="sm" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
                  <p className="truncate text-sm font-medium text-foreground sm:text-base">{appName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {topbarAction}
                <button
                  type="button"
                  aria-label="Open profile"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold shadow-sm"
                  onClick={() => setProfileOpen((current) => !current)}
                >
                  <User size={17} />
                </button>
                <div className="rounded-full border border-border bg-card/85 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                  <span className="inline-flex items-center gap-1.5"><Store size={14} /> DokanX Live</span>
                </div>
              </div>
            </div>
            {profileOpen ? (
              <div className="absolute right-4 top-16 z-30 w-72 rounded-2xl border border-border bg-card p-4 text-sm shadow-xl">
                <p className="font-semibold text-foreground">Profile hub</p>
                <p className="mt-1 text-xs text-muted-foreground">Profile, wallet, to-do, documents, and settings.</p>
                <div className="mt-4 grid gap-2">
                  <Link className="rounded-xl px-3 py-2 hover:bg-muted" href={profileBase ? `${profileBase}` : "/profile"}>Profile</Link>
                  <Link className="rounded-xl px-3 py-2 hover:bg-muted" href={profileBase ? `${profileBase}/wallet` : "/wallet"}>Wallet</Link>
                  <Link className="rounded-xl px-3 py-2 hover:bg-muted" href={profileBase ? `${profileBase}/todo` : "/notifications"}>To-do</Link>
                  <Link className="rounded-xl px-3 py-2 hover:bg-muted" href={profileBase ? `${profileBase}/documents` : "/settings"}>Documents</Link>
                  <Link className="rounded-xl px-3 py-2 hover:bg-muted" href={profileBase ? `${profileBase}/settings` : "/settings"}>Settings</Link>
                </div>
              </div>
            ) : null}
          </div>
          <div className="dx-shell-content px-4 py-4 sm:px-6 sm:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

