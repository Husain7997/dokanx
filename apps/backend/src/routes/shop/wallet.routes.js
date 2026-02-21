const express = require("express");
const router = express.Router();

const { protect, allowRoles } = require("../../middlewares");
// const allowRoles = require("../../middlewares/rbac.middleware");
const WalletController = require("../../controllers/shop/wallet.controller");
const {
  requestPayout
} = require('../../controllers/shop/shopPayout.controller');

router.use(protect);
router.use(allowRoles("SHOP"));
router.post(
  '/payouts',
  protect,
  allowRoles('shop_owner'),
  requestPayout
);

router.post("/topup", WalletController.topupWallet);
router.post("/transfer", WalletController.transferWallet);

module.exports = router;
