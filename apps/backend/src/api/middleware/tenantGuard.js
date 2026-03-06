// src/api/middleware/tenantGuard.js

/**
 * TENANT GUARD
 * Ensures multi-tenant isolation
 */
function tenantGuard(req, res, next) {
  try {
    // Public routes should pass. Guard applies to authenticated tenant flows.
    if (!req.user) {
      return next();
    }

    if (!req.user.shopId) {
      return res.status(403).json({
        message: "Tenant context missing"
      });
    }

    const userShopId = String(req.user.shopId);

    // Attach tenant context if not already resolved by auth middleware.
    if (!req.shop) {
      req.shop = { _id: req.user.shopId };
      return next();
    }

    const reqShopId = String(req.shop._id || req.shop.id || "");
    if (!reqShopId || reqShopId !== userShopId) {
      return res.status(403).json({
        message: "Tenant mismatch"
      });
    }

    next();
  } catch (err) {
    console.error("TENANT GUARD ERROR:", err);
    return res.status(500).json({
      message: "Tenant guard failed"
    });
  }
}

module.exports = {
  tenantGuard
};
