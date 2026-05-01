import type { NavigationItem } from "@dokanx/ui";

export type MerchantPermission =
  | "AI_VIEW_OVERVIEW"
  | "AI_VIEW_INVENTORY"
  | "AI_VIEW_CUSTOMERS"
  | "AI_VIEW_CREDIT"
  | "AI_VIEW_PAYMENTS"
  | "AI_VIEW_FORECAST"
  | "AI_VIEW_PRICING"
  | "AI_VIEW_MERCHANT_INSIGHTS"
  | "SHOP_MANAGE_TEAM";

export type AppUserLike = {
  role?: string | null;
  roleName?: string | null;
  permissionOverrides?: string[] | null;
  effectivePermissions?: string[] | null;
} | null | undefined;

export type NavigationItemWithPermission = NavigationItem & {
  permission?: MerchantPermission;
};

const ROLE_PERMISSIONS: Record<string, MerchantPermission[] | ["*"]> = {
  admin: ["*"],
  merchant: [
    "AI_VIEW_OVERVIEW",
    "AI_VIEW_INVENTORY",
    "AI_VIEW_CUSTOMERS",
    "AI_VIEW_CREDIT",
    "AI_VIEW_PAYMENTS",
    "AI_VIEW_FORECAST",
    "AI_VIEW_PRICING",
    "AI_VIEW_MERCHANT_INSIGHTS",
    "SHOP_MANAGE_TEAM",
  ],
  staff: [
    "AI_VIEW_OVERVIEW",
    "AI_VIEW_INVENTORY",
    "AI_VIEW_CUSTOMERS",
  ],
  customer: [],
  developer: [],
  agent: [],
};

export const PERMISSION_GROUPS: Array<{
  id: string;
  label: string;
  description: string;
  items: Array<{ key: MerchantPermission; label: string; description: string }>;
}> = [
  {
    id: "ai",
    label: "AI Insights",
    description: "Control which intelligence modules a user can see.",
    items: [
      { key: "AI_VIEW_OVERVIEW", label: "AI overview", description: "Copilot summaries and high-level AI cards" },
      { key: "AI_VIEW_INVENTORY", label: "Inventory AI", description: "Restock and stock pressure intelligence" },
      { key: "AI_VIEW_CUSTOMERS", label: "Customer AI", description: "Customer segments and behavioral insights" },
      { key: "AI_VIEW_CREDIT", label: "Credit AI", description: "Credit risk and limit recommendations" },
      { key: "AI_VIEW_PAYMENTS", label: "Payment AI", description: "Payment anomaly and gateway intelligence" },
      { key: "AI_VIEW_FORECAST", label: "Forecast AI", description: "Demand and sales forecasting" },
      { key: "AI_VIEW_PRICING", label: "Pricing AI", description: "Pricing suggestions and product pressure" },
      { key: "AI_VIEW_MERCHANT_INSIGHTS", label: "Merchant insights", description: "Executive merchant intelligence summaries" },
    ],
  },
  {
    id: "admin",
    label: "Workspace Control",
    description: "Control access to sensitive team and workspace settings.",
    items: [
      { key: "SHOP_MANAGE_TEAM", label: "Manage team", description: "Invite teammates and update their access" },
    ],
  },
];

function unique(values: string[] = []) {
  return [...new Set(values.map((item) => String(item || "").trim().toUpperCase()).filter(Boolean))];
}

export function getRolePermissions(user: AppUserLike) {
  const roleName = String(user?.roleName || user?.role || "").toLowerCase();
  const permissions = ROLE_PERMISSIONS[roleName] || [];
  return unique(permissions as string[]);
}

export function getEffectivePermissions(user: AppUserLike) {
  const explicit = unique(Array.isArray(user?.effectivePermissions) ? user?.effectivePermissions : []);
  if (explicit.includes("*")) return explicit;
  return unique([
    ...getRolePermissions(user),
    ...unique(Array.isArray(user?.permissionOverrides) ? user?.permissionOverrides : []),
    ...explicit,
  ]);
}

export function hasPermission(user: AppUserLike, permission?: MerchantPermission) {
  if (!permission) return true;
  const permissions = getEffectivePermissions(user);
  return permissions.includes("*") || permissions.includes(permission);
}

export function filterNavigationByPermissions(items: NavigationItemWithPermission[], user: AppUserLike) {
  return items.filter((item) => hasPermission(user, item.permission)).map(({ href, label }) => ({ href, label }));
}

export function getRequiredPermissionForPath(pathname: string): MerchantPermission | null {
  if (pathname.startsWith("/settings")) return "SHOP_MANAGE_TEAM";
  if (pathname.startsWith("/themes")) return null;
  if (pathname.startsWith("/payments")) return "AI_VIEW_PAYMENTS";
  if (pathname.startsWith("/customers")) return "AI_VIEW_CUSTOMERS";
  if (pathname.startsWith("/analytics")) return "AI_VIEW_FORECAST";
  if (pathname.startsWith("/finance")) return "AI_VIEW_CREDIT";
  return null;
}
