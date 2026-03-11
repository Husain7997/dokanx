const express = require("express");
const router = express.Router();

const {
  createShop,
  updateOrderStatus,
  blockCustomer
} = require('../controllers/shop.controller');

const { protect, allowRoles } = require("../middlewares");

const canUpdateOrderStatus = (req, res, next) => next();

router.put(
  "/:shopId/block-user/:userId",
  protect,
  allowRoles("OWNER"),
  blockCustomer
);

router.put(
  "/:id/status",
  protect,
  canUpdateOrderStatus,
  updateOrderStatus
);

router.post(
  "/",
  protect,
  allowRoles("OWNER", "ADMIN"),
  createShop
);

module.exports = router;
