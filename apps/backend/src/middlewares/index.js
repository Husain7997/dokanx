
//   module.exports = {
//   protect: require('./auth.middleware'),     
//   allowRoles: require('./rbac.middleware'),  

//    optionalAuth: require('./optionalAuth.middleware'),
//    resolveShop: require('./resolveShop.middleware'),
// };



// module.exports = {
//  protect: require('./auth.middleware'),
//   allowRoles: require('./rbac.middleware'),
//   resolveShop: require('./resolveShop.middleware'),
//    optionalAuth: require('./optionalAuth.middleware'),
//    blockCustomer: require('./checkUserNotBlocked'),
// };

  
const { protect } = require("./auth.middleware");
const { allowRoles, blockCustomer } = require("./rbac.middleware");

module.exports = {
  protect,
  allowRoles,
  blockCustomer,
    resolveShop: require('./resolveShop.middleware'),
   optionalAuth: require('./optionalAuth.middleware'),
};


