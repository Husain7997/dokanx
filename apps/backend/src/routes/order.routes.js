const express = require('express');
const router = express.Router();

const { protect, allowRoles } = require('../middlewares');
const checkUserNotBlocked = require("../middlewares/checkUserNotBlocked");
const optionalAuth = require("../middlewares/optionalAuth.middleware");
const idempotency = require("../core/idempotency/idempotency.middleware");
const { canUpdateOrderStatus } = require("../middlewares/orderRole.guard");

const {
  updateOrderStatus,
  placeOrder,
  getOrders,
  getMyOrders,
  getOrderById,
} = require('../controllers/order.controller');

router.post(
  "/",
  optionalAuth,
  idempotency,
  checkUserNotBlocked,
  allowRoles('CUSTOMER'),
  placeOrder
);

router.get(
  "/my",
  protect,
  allowRoles("CUSTOMER", "OWNER", "STAFF", "ADMIN"),
  (req, res, next) => {
    const role = String(req.user?.role || "").toUpperCase();
    if (role === "CUSTOMER") {
      return getMyOrders(req, res, next);
    }
    return getOrders(req, res, next);
  }
);

router.get(
  "/:orderId",
  protect,
  allowRoles("CUSTOMER", "OWNER", "STAFF", "ADMIN"),
  getOrderById
);

router.patch(
  "/:orderId/status",
  protect,
  checkUserNotBlocked,
  allowRoles("OWNER", "STAFF", "ADMIN", "CUSTOMER"),
  canUpdateOrderStatus,
  updateOrderStatus
);

router.get(
  '/',
  protect,
  allowRoles('OWNER', 'STAFF', 'ADMIN'),
  getOrders
);

module.exports = router;
