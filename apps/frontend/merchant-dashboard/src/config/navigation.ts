import type { NavigationItemWithPermission } from "@/lib/permissions";

export const navigation: NavigationItemWithPermission[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/inventory", label: "Inventory", permission: "AI_VIEW_INVENTORY" },
  { href: "/orders", label: "Orders" },
  { href: "/customers", label: "Customers", permission: "AI_VIEW_CUSTOMERS" },
  { href: "/analytics", label: "Analytics", permission: "AI_VIEW_FORECAST" },
  { href: "/finance", label: "Finance", permission: "AI_VIEW_CREDIT" },
  { href: "/wallet", label: "Wallet" },
  { href: "/payments", label: "Payments", permission: "AI_VIEW_PAYMENTS" },
  { href: "/shipping", label: "Shipping" },
  { href: "/shipping/tracking-map", label: "Tracking Map" },
  { href: "/courier", label: "Courier" },
  { href: "/pos", label: "POS" },
  { href: "/marketing", label: "Marketing" },
  { href: "/reviews", label: "Reviews" },
  { href: "/notifications", label: "Notifications" },
  { href: "/themes", label: "Themes" },
  { href: "/apps", label: "Apps" },
  { href: "/settings", label: "Settings", permission: "SHOP_MANAGE_TEAM" }
];

export const agentNavigation: NavigationItemWithPermission[] = [
  { href: "/agent/learn", label: "Agent Learn" },
];
