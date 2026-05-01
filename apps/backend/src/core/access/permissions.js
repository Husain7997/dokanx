const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ["*"],
  ADMIN: ["*"],
  OWNER: [
    "ORDER_CREATE",
    "ORDER_READ_SHOP",
    "ORDER_UPDATE_STATUS",
    "PAYMENT_INITIATE",
    "PAYMENT_RETRY",
    "PRODUCT_WRITE",
    "PRODUCT_READ_INVENTORY",
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
  STAFF: [
    "ORDER_READ_SHOP",
    "ORDER_UPDATE_STATUS",
    "PAYMENT_INITIATE",
    "PAYMENT_RETRY",
    "PRODUCT_READ_INVENTORY",
    "AI_VIEW_OVERVIEW",
    "AI_VIEW_INVENTORY",
    "AI_VIEW_CUSTOMERS",
  ],
  CUSTOMER: [
    "ORDER_CREATE",
    "ORDER_READ_SELF",
    "ORDER_UPDATE_STATUS",
    "PAYMENT_INITIATE",
    "PAYMENT_RETRY",
    "PRODUCT_REVIEW_CREATE",
  ],
  DEVELOPER: [],
  AGENT: [],
  FINANCE_ADMIN: [
    "ADMIN_VIEW_ORDERS",
    "PAYMENT_REFUND",
    "AI_VIEW_PAYMENTS",
    "AI_VIEW_CREDIT",
  ],
  SUPPORT_ADMIN: [
    "ADMIN_MANAGE_USERS",
    "ADMIN_VIEW_ORDERS",
    "AI_VIEW_OVERVIEW",
    "AI_VIEW_CUSTOMERS",
    "AI_VIEW_PAYMENTS",
  ],
  AUDIT_ADMIN: [
    "ADMIN_VIEW_AUDIT",
    "ADMIN_VIEW_ORDERS",
    "ADMIN_VIEW_SHOPS",
    "AI_VIEW_OVERVIEW",
    "AI_VIEW_CREDIT",
    "AI_VIEW_PAYMENTS",
    "AI_VIEW_MERCHANT_INSIGHTS",
  ],
};

function unique(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim().toUpperCase()))];
}

function getRolePermissions(role) {
  return unique(ROLE_PERMISSIONS[String(role || "").toUpperCase()] || []);
}

function getEffectivePermissions(user = null) {
  const rolePermissions = getRolePermissions(user?.role);
  const overridePermissions = unique(Array.isArray(user?.permissionOverrides) ? user.permissionOverrides : []);
  if (rolePermissions.includes("*") || overridePermissions.includes("*")) {
    return ["*"];
  }
  return unique([...rolePermissions, ...overridePermissions]);
}

function hasPermission(user, permission) {
  const needed = String(permission || "").trim().toUpperCase();
  if (!needed) return true;
  const effective = getEffectivePermissions(user);
  return effective.includes("*") || effective.includes(needed);
}

function hasAnyPermission(user, permissions = []) {
  const effective = getEffectivePermissions(user);
  if (effective.includes("*")) return true;
  const needed = unique(permissions);
  if (!needed.length) return true;
  return needed.some((permission) => effective.includes(permission));
}

module.exports = {
  ROLE_PERMISSIONS,
  getRolePermissions,
  getEffectivePermissions,
  hasPermission,
  hasAnyPermission,
};
