const router = require('express').Router();

const payoutController = require('../../controllers/admin/payout.controller');
const { protect, allowRoles } = require('../../middlewares');
// const allowRoles = require('../../middlewares/rbac.middleware');
const financeLock = require('../../middlewares/financeLock.middleware');
const rateLimit = require('../../middlewares/rateLimit');
const { requireSensitiveOtp } = require('../../middlewares/requireSensitiveOtp.middleware');

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
  requireSensitiveOtp({
    action: 'PAYOUT_APPROVE',
    targetId: (req) => req.params.id,
  }),
  payoutController.approve
);

/**
 * 🔹 Admin executes payout
 */
router.post(
  '/:id/execute',
  requireSensitiveOtp({
    action: 'PAYOUT_EXECUTE',
    targetId: (req) => req.params.id,
  }),
  payoutController.execute
);

/**
 * 🔹 Manual payout (ops / internal)
 */
router.post(
  '/manual',
  requireSensitiveOtp({
    action: 'PAYOUT_MANUAL',
    targetId: (req) => req.body?.referenceId || req.body?.walletId,
  }),
  payoutController.manualPayout
);

/**
 * 🔹 Retry payout
 */
router.post(
  '/:id/retry',
  requireSensitiveOtp({
    action: 'PAYOUT_RETRY',
    targetId: (req) => req.params.id,
  }),
  payoutController.retryPayout
);

module.exports = router;
