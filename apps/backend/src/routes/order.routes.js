const express = require('express');
const router = express.Router();

const {protect} = require('../middlewares/auth.middleware');
const tenant = require('../middlewares/tenant.middleware');
const allowRoles = require('../middlewares/role.middleware');

const {
  placeOrder,
  getOrders
} = require('../controllers/order.controller');
console.log("protect TYPE:", typeof protect);
// CUSTOMER → order create
router.post(
  '/',
  protect,
  tenant,
  allowRoles('customer'),
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
console.log("createOrder TYPE:", placeOrder, typeof placeOrder, getOrders, typeof getOrders );
module.exports = router;
