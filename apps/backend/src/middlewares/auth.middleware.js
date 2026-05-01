const User = require("../models/user.model");
const Shop = require("../models/shop.model");
const { verifyAccessToken } = require("../security/token.service");

function isPrivilegedRole(role) {
  return ["ADMIN", "SUPER_ADMIN", "FINANCE_ADMIN", "SUPPORT_ADMIN", "AUDIT_ADMIN"].includes(
    String(role || "")
  );
}

async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ message: "No token" });
    }

    const [scheme, token] = String(header).split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Invalid authorization header" });
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Account is blocked" });
    }

    let shop = null;
    if (user.shopId) {
      shop = await Shop.findById(user.shopId);
    }

    const effectiveShop = req.shop || req.tenant || shop || null;
    if (
      effectiveShop &&
      user.shopId &&
      !isPrivilegedRole(user.role) &&
      String(effectiveShop._id || effectiveShop) !== String(user.shopId)
    ) {
      return res.status(403).json({ message: "Tenant scope violation" });
    }

    req.user = user;
    req.user.id = String(user._id);
    req.shop = effectiveShop;
    req.auth = decoded;

    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

module.exports = { protect };
