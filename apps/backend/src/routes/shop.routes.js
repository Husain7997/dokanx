const express = require("express");
const router = express.Router();

const {
  createShop,
  updateOrderStatus,
  blockCustomer
} = require('../controllers/shop.controller');

const { protect } = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

const canUpdateOrderStatus = (req, res, next) => next();
console.log("protect TYPE:", typeof protect);
console.log("role(owner) TYPE:", typeof role("owner"));
console.log("blockCustomer TYPE:", typeof blockCustomer);

router.put(
  "/:shopId/block-user/:userId",
  protect,
  role("owner"),
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
  role("owner"),
  createShop
);

module.exports = router;
