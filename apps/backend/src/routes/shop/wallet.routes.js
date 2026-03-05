const express = require("express");
const router = express.Router();

const { protect, allowRoles } = require("../../middlewares");
// const allowRoles = require("../../middlewares/rbac.middleware");
const WalletController = require("../../controllers/shop/wallet.controller");
const { redisRateLimiter } =
  require("@/platform/rate-limit/redisRateLimiter");
const {
  requestPayout
} = require('../../controllers/shop/shopPayout.controller');

router.use(protect);
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
  WalletController.topupWallet
);
router.post(
  "/transfer",
  redisRateLimiter({ scope: "wallet.transfer", limit: 20, windowSec: 60 }),
  WalletController.transferWallet
);

module.exports = router;
