type AppUserLike = {
  role?: string | null;
  roleName?: string | null;
  permissionOverrides?: string[] | null;
  effectivePermissions?: string[] | null;
} | null | undefined;

export type AdminPagePermission =
  | "ADMIN_VIEW_DASHBOARD"
  | "ADMIN_VIEW_OPERATIONS"
  | "ADMIN_VIEW_FINANCE"
  | "ADMIN_VIEW_RISK"
  | "ADMIN_VIEW_USERS"
  | "ADMIN_VIEW_SETTINGS";

export type AdminNavigationItem = {
  label: string;
  href: string;
  description: string;
  permission?: AdminPagePermission;
};

const ROLE_PAGE_PERMISSIONS: Record<string, AdminPagePermission[] | ["*"]> = {
  admin: ["*"],
  finance_admin: ["ADMIN_VIEW_DASHBOARD", "ADMIN_VIEW_FINANCE"],
  support_admin: ["ADMIN_VIEW_DASHBOARD", "ADMIN_VIEW_OPERATIONS", "ADMIN_VIEW_USERS"],
  audit_admin: ["ADMIN_VIEW_DASHBOARD", "ADMIN_VIEW_FINANCE", "ADMIN_VIEW_RISK"],
};

function unique(values: string[] = []) {
  return [...new Set(values.map((value) => String(value || "").trim().toUpperCase()).filter(Boolean))];
}

export function getAdminPagePermissions(user: AppUserLike) {
  const roleName = String(user?.roleName || user?.role || "").toLowerCase();
  const derived = unique((ROLE_PAGE_PERMISSIONS[roleName] || []) as string[]);
  const effective = unique(Array.isArray(user?.effectivePermissions) ? user?.effectivePermissions : []);
  if (derived.includes("*") || effective.includes("*")) return ["*"];
  return unique([...derived, ...effective]);
}

export function hasAdminPagePermission(user: AppUserLike, permission?: AdminPagePermission) {
  if (!permission) return true;
  const permissions = getAdminPagePermissions(user);
  return permissions.includes("*") || permissions.includes(permission);
}

export function filterAdminNavigation(items: AdminNavigationItem[], user: AppUserLike) {
  return items.filter((item) => hasAdminPagePermission(user, item.permission));
}

export function getAdminRequiredPermission(pathname: string): AdminPagePermission | null {
  if (["/finance", "/payments", "/settlements"].some((prefix) => pathname.startsWith(prefix))) return "ADMIN_VIEW_FINANCE";
  if (["/risk", "/security", "/orders", "/ai-ops"].some((prefix) => pathname.startsWith(prefix))) return "ADMIN_VIEW_RISK";
  if (["/users", "/permissions"].some((prefix) => pathname.startsWith(prefix))) return "ADMIN_VIEW_USERS";
  if (["/settings", "/integrations"].some((prefix) => pathname.startsWith(prefix))) return "ADMIN_VIEW_SETTINGS";
  if (["/dashboard", "/analytics"].some((prefix) => pathname.startsWith(prefix))) return "ADMIN_VIEW_DASHBOARD";
  return "ADMIN_VIEW_OPERATIONS";
}