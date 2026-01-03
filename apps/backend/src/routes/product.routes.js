const express = require('express');
const router = express.Router();
const allowRoles = require('../middleware/role.middleware');

const auth = require('../middleware/auth.middleware');
const tenant = require('../middleware/tenant.middleware');
const { createProduct, getProducts } = require('../controllers/product.controller');

router.post(
  '/',
  auth,
  tenant,
  allowRoles('owner', 'admin', 'staff'),
  createProduct
);
router.get('/', auth, tenant, getProducts);

module.exports = router;
