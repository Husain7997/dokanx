const express = require('express');
const router = express.Router();

const {protect} = require('../middlewares/auth.middleware');
const tenant = require('../middlewares/tenant.middleware');
const allowRoles = require('../middlewares/role.middleware');
const checkUserNotBlocked = require("../middlewares/checkUserNotBlocked");
const optionalAuth = require("../middlewares/optionalAuth.middleware");


const {
  // createOrder,
  placeOrder,
  getOrders
} = require('../controllers/order.controller');

// CUSTOMER → order create
router.post(
  "/",
  optionalAuth,
  tenant,
  checkUserNotBlocked,
  
  // allowRoles('customer'),
  placeOrder
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
