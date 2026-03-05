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

module.exports = (...roles) => {
  return (req, res, next) => {

    const role = normalizeRole(req.user?.role);
    const allowed = roles.map(normalizeRole);

    if (!allowed.includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};
