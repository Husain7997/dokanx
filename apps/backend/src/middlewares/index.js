const { protect } = require("./auth.middleware");
const { allowRoles, blockCustomer } = require("./rbac.middleware");

module.exports = {
  protect,
  allowRoles,
  blockCustomer,
  optionalAuth: require("./optionalAuth.middleware"),
};
