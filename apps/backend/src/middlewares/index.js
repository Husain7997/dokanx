
//   module.exports = {
//   protect: require('./auth.middleware'),     
//   allowRoles: require('./rbac.middleware'),  

//    optionalAuth: require('./optionalAuth.middleware'),
//    resolveshopId: require('./resolveShop.middleware'),
// };



// module.exports = {
//  protect: require('./auth.middleware'),
//   allowRoles: require('./rbac.middleware'),
//   resolveshopId: require('./resolveShop.middleware'),
//    optionalAuth: require('./optionalAuth.middleware'),
//    blockCustomer: require('./checkUserNotBlocked'),
// };

  
const { protect } = require("./auth.middleware");
const { allowRoles, blockCustomer } = require("./rbac.middleware");
const tenantResolver = require("./tenant.middleware");

module.exports = {
  protect,
  allowRoles,
  blockCustomer,
  tenantResolver,
    
   optionalAuth: require('./optionalAuth.middleware'),
};


