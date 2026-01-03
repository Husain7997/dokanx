const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const tenant = require('../middleware/tenant.middleware');
const allowRoles = require('../middleware/role.middleware');

const {
  placeOrder,
  getOrders
} = require('../controllers/order.controller');

// CUSTOMER → order create
router.post(
  '/',
  auth,
  tenant,
  allowRoles('customer'),
  placeOrder
);

// OWNER / ADMIN → view orders
router.get(
  '/',
  auth,
  tenant,
  allowRoles('owner', 'admin'),
  getOrders
);

module.exports = router;
