const express = require("express");
const router = express.Router();

const { protect, allowRoles } = require("../middlewares");
const checkUserNotBlocked = require("../middlewares/checkUserNotBlocked");
const optionalAuth = require("../middlewares/optionalAuth.middleware");
const { canUpdateOrderStatus } = require("../middlewares/orderRole.guard");

const {
  updateOrderStatus,
  placeOrder,
  getOrders,
} = require("../controllers/order.controller");

router.post(
  "/",
  optionalAuth,
  checkUserNotBlocked,
  allowRoles("CUSTOMER"),
  placeOrder
);

router.patch(
  "/:orderId/status",
  protect,
  checkUserNotBlocked,
  allowRoles("OWNER", "ADMIN", "CUSTOMER"),
  canUpdateOrderStatus,
  updateOrderStatus
);

router.get(
  "/",
  protect,
  allowRoles("OWNER", "ADMIN"),
  getOrders
);

module.exports = router;
