const router = require('express').Router();

const payoutController = require('../../controllers/admin/payout.controller');
const { protect, allowRoles } = require('../../middlewares');
// const allowRoles = require('../../middlewares/rbac.middleware');
const financeLock = require('../../middlewares/financeLock.middleware');
const rateLimit = require('../../middlewares/rateLimit');

// 🔐 Global guards
router.use(protect);
router.use(allowRoles('ADMIN'));
router.use(financeLock);

/**
 * 🔹 Owner initiates payout (shop payout request)
 */
router.post(
  '/',
  rateLimit,
  payoutController.createShopPayout
);

/**
 * 🔹 Admin creates payout for shop
 */
router.post(
  '/admin',
  payoutController.createAdminPayout
);

/**
 * 🔹 Admin approves payout
 */
router.post(
  '/:id/approve',
  payoutController.approve
);

/**
 * 🔹 Admin executes payout
 */
router.post(
  '/:id/execute',
  payoutController.execute
);

/**
 * 🔹 Manual payout (ops / internal)
 */
router.post(
  '/manual',
  payoutController.manualPayout
);

/**
 * 🔹 Retry payout
 */
router.post(
  '/retry',
  payoutController.retryPayout
);

module.exports = router;
