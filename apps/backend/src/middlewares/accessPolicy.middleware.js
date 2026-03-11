const { protect, allowRoles } = require("@/middlewares");
const { tenantGuard } = require("@/api/middleware/tenantGuard");
const checkShopOwnership = require("@/middlewares/checkShopOwnership");

function tenantAccess(...roles) {
  return [protect, tenantGuard, allowRoles(...roles)];
}

function ownerShopAccess(...roles) {
  return [...tenantAccess(...roles), checkShopOwnership];
}

module.exports = {
  tenantAccess,
  ownerShopAccess,
};
