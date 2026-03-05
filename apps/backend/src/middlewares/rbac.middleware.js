/* ===============================
   ROLE BASED ACCESS
================================*/

const ROLE_ALIAS = {
  SHOP: "OWNER",
  SHOP_OWNER: "OWNER",
  MERCHANT: "OWNER",
  FINANCE_MAKER: "ADMIN",
  FINANCE_CHECKER: "ADMIN"
};

function normalizeRole(role) {
  const upper = String(role || "").trim().toUpperCase();
  return ROLE_ALIAS[upper] || upper;
}

const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userRole = normalizeRole(req.user.role);
    const normalized = allowedRoles.map(normalizeRole);

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
  if (normalizeRole(req.user.role) === "CUSTOMER") {
    return res.status(403).json({
      message: "Customers not allowed",
    });
  }

  next();
};

module.exports = {
  allowRoles,
  blockCustomer,
};
