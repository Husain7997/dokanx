const express = require("express");
const router = express.Router();

const { protect, allowRoles } = require("../../middlewares");
// const allowRoles = require("../../middlewares/rbac.middleware");
const WalletController = require("../../controllers/shop/wallet.controller");
const {
  requestPayout
} = require('../../controllers/shop/shopPayout.controller');

router.use(protect);
router.use(allowRoles("OWNER", "STAFF", "ADMIN"));
router.post(
  '/payouts',
  protect,
  allowRoles("OWNER", "ADMIN"),
  requestPayout
);

router.post("/topup", WalletController.topupWallet);
router.post("/transfer", WalletController.transferWallet);
router.get("/summary", WalletController.getWalletSummary);

module.exports = router;
