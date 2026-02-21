const router = require('express').Router();

const { protect, allowRoles } = require('../../middlewares');
const resolveShop = require('../../middlewares/resolveShop.middleware');
const {requestPayout}  = require('../../controllers/shop/shopPayout.controller');

// ✅ IMPORTANT: function pass করতে হবে, object না
// router.post(
//   '/payouts',
//   protect,
//   allowRoles('OWNER'),
//   resolveShop,
//   requestPayout
// );
router.post(
  '/request',
  protect,
  resolveShop,
  requestPayout   // ✅ FUNCTION
);
module.exports = router;
