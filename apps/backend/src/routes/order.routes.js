const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares');
const tenant = require('../middlewares/tenant.middleware');
const allowRoles = require('../middlewares/role.middleware');
const checkUserNotBlocked = require("../middlewares/checkUserNotBlocked");
const optionalAuth = require("../middlewares/optionalAuth.middleware");
const { resolveShop } = require("../middlewares/shop.middleware");
// const auth = require("../middlewares/auth.middleware");
const { canUpdateOrderStatus } = require("../middlewares/orderRole.guard");

const {
  // createOrder,
  updateOrderStatus,
  placeOrder,
  getOrders
} = require('../controllers/order.controller');
console.log("auth TYPE:", typeof auth);
console.log("canUpdateOrderStatus TYPE:", typeof canUpdateOrderStatus);
console.log("updateOrderStatus TYPE:", typeof updateOrderStatus);
// CUSTOMER → order create
router.post(
  "/",
  // resolveShop,
  optionalAuth,
  tenant,
  checkUserNotBlocked,

  // allowRoles('customer'),
  placeOrder
);
// UPDATE ORDER STATUS (OWNER / ADMIN)
router.patch(
  "/:orderId/status",
  resolveShop,
  protect,                 // ✅ MUST
  tenant,                  // ✅ tenant context
  checkUserNotBlocked,
  allowRoles("owner", "admin", "customer"),
  canUpdateOrderStatus,    // role + order state guard
  updateOrderStatus
);



// OWNER / ADMIN → view orders
router.get(
  '/',
  protect,
  tenant,
  allowRoles('owner', 'admin'),
  getOrders
);

module.exports = router;
