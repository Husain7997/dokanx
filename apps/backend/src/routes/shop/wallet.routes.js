const express = require("express");
const router = express.Router();

const { protect, allowRoles } = require("../../middlewares");
// const allowRoles = require("../../middlewares/rbac.middleware");
const { tenantGuard } = require("@/api/middleware/tenantGuard");
const WalletController = require("../../controllers/shop/wallet.controller");
const { redisRateLimiter } =
  require("@/platform/rate-limit/redisRateLimiter");
const { validateBody } = require("../../middlewares/validateRequest");
const legacyValidator = require("../../validators/legacyRoutes.validator");
const {
  requestPayout
} = require('../../controllers/shop/shopPayout.controller');

router.use(protect);
router.use(tenantGuard);
router.use(allowRoles("OWNER", "ADMIN"));
router.post(
  '/payouts',
  redisRateLimiter({ scope: "wallet.payout", limit: 20, windowSec: 60 }),
  allowRoles("OWNER", "ADMIN"),
  requestPayout
);

router.post(
  "/topup",
  redisRateLimiter({ scope: "wallet.topup", limit: 30, windowSec: 60 }),
  validateBody(legacyValidator.validateWalletTopupBody),
  WalletController.topupWallet
);
router.post(
  "/transfer",
  redisRateLimiter({ scope: "wallet.transfer", limit: 20, windowSec: 60 }),
  validateBody(legacyValidator.validateWalletTransferBody),
  WalletController.transferWallet
);

module.exports = router;
