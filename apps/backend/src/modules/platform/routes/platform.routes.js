const router = require('express').Router();

const platformAuth =
  require('../middleware/platformAuth.middleware');

const authController =
  require('../controllers/platform.auth.controller');

const shopController =
  require('../controllers/platform.shop.controller');

const orderController =
  require('../controllers/platform.order.controller');

const dashboardController =
  require('../controllers/platform.dashboard.controller');

router.post('/key', authController.generateKey);

router.use(platformAuth);

router.get('/shop', shopController.getShop);

router.post('/orders', orderController.createOrder);

router.get('/dashboard', dashboardController.getDashboard);

module.exports = router;