const { getEffectivePermissions, hasAnyPermission } = require("../core/access/permissions");

/* ===============================
   ROLE BASED ACCESS
================================*/

const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userRole = req.user.role?.toLowerCase();

    // SUPER_ADMIN should always be allowed through admin guard checks.
    if (userRole === "super_admin") {
      return next();
    }

    const normalized = allowedRoles.map(r =>
      r.toLowerCase()
    );

    if (!normalized.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    next();
  };
};

/* ===============================
   BLOCK CUSTOMER
================================*/

const blockCustomer = (req, res, next) => {
  if (req.user.role?.toLowerCase() === "customer") {
    return res.status(403).json({
      message: "Customers not allowed",
    });
  }

  next();
};

const requirePermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    req.user.effectivePermissions = getEffectivePermissions(req.user);

    if (!hasAnyPermission(req.user, permissions)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        requiredPermissions: permissions.map((permission) => String(permission).toUpperCase()),
      });
    }

    next();
  };
};

module.exports = {
  allowRoles,
  blockCustomer,
  requirePermissions,
};
