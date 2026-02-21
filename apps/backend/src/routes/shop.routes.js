const express = require("express");
const router = express.Router();

const {
  createShop,
  updateOrderStatus,
  blockCustomer
} = require('../controllers/shop.controller');

const { protect,  allowRoles } = require("../middlewares");
// const allowRoles = require('../middlewares/rbac.middleware');

const canUpdateOrderStatus = (req, res, next) => next();
console.log("protect TYPE:", typeof protect);
console.log("allowRoles TYPE:", typeof allowRoles);
console.log("blockCustomer TYPE:", typeof blockCustomer);

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
