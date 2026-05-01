const router = require('express').Router();
const ctrl = require('../../controllers/admin/adjustment.controller');
const { protect, allowRoles } = require('../../middlewares');
const { requireSensitiveOtp } = require('../../middlewares/requireSensitiveOtp.middleware');

router.use(protect);
router.use(allowRoles('ADMIN'));

router.post(
  '/refund',
  requireSensitiveOtp({
    action: 'ADJUSTMENT_REFUND',
    targetId: (req) => req.body?.shopId,
  }),
  ctrl.refundShop
);
router.post(
  '/adjust',
  requireSensitiveOtp({
    action: 'ADJUSTMENT_WALLET',
    targetId: (req) => req.body?.shopId,
  }),
  ctrl.adjustWallet
);

module.exports = router;
