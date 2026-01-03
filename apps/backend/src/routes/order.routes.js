const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const tenant = require('../middleware/tenant.middleware');
const { placeOrder, getOrders } = require('../controllers/order.controller');



router.post('/', auth, tenant, placeOrder);
router.get('/', auth, tenant, getOrders);

module.exports = router;
