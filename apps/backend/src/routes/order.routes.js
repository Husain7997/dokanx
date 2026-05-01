const express = require('express');
const router = express.Router();

const { protect, allowRoles, requirePermissions } = require('../middlewares');
const checkUserNotBlocked = require("../middlewares/checkUserNotBlocked");
const optionalAuth = require("../middlewares/optionalAuth.middleware");
const idempotency = require("../core/idempotency/idempotency.middleware");
const { canUpdateOrderStatus } = require("../middlewares/orderRole.guard");
const { validateRequest } = require("../middlewares/validateRequest.middleware");
const { schemas } = require("../validation/security.schemas");

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
  requirePermissions("ORDER_CREATE"),
  validateRequest(schemas.orderCreate),
  placeOrder
);

router.get(
  "/my",
  protect,
  allowRoles("CUSTOMER", "OWNER", "STAFF", "ADMIN"),
  requirePermissions("ORDER_READ_SELF", "ORDER_READ_SHOP", "ADMIN_VIEW_ORDERS"),
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
  requirePermissions("ORDER_READ_SELF", "ORDER_READ_SHOP", "ADMIN_VIEW_ORDERS"),
  getOrderById
);

router.patch(
  "/:orderId/status",
  protect,
  checkUserNotBlocked,
  allowRoles("OWNER", "STAFF", "ADMIN", "CUSTOMER"),
  requirePermissions("ORDER_UPDATE_STATUS"),
  validateRequest(schemas.orderStatusUpdate),
  canUpdateOrderStatus,
  updateOrderStatus
);

router.get(
  '/',
  protect,
  allowRoles('OWNER', 'STAFF', 'ADMIN'),
  requirePermissions("ORDER_READ_SHOP", "ADMIN_VIEW_ORDERS"),
  getOrders
);

module.exports = router;
