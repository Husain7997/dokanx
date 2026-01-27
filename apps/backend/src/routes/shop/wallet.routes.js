const express = require("express");
const router = express.Router();

const { protect } = require("../../middlewares/auth.middleware");
const allowRoles = require("../../middlewares/rbac.middleware");
const WalletController = require("../../controllers/shop/wallet.controller");

router.use(protect);
router.use(allowRoles("SHOP"));

router.post("/topup", WalletController.topupWallet);
router.post("/transfer", WalletController.transferWallet);

module.exports = router;
