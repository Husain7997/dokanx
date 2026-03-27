// src/routes/wallet.routes.js

const router = require("express").Router();

const idempotency = require("../core/idempotency/idempotency.middleware");
const { protect, allowRoles } = require("../middlewares");

const shopWalletController = require("../controllers/shop/wallet.controller");
const customerWalletController = require("../controllers/customer/wallet.controller");

router.use(protect);

router.get(
  "/me",
  allowRoles("CUSTOMER", "OWNER", "STAFF", "ADMIN"),
  (req, res, next) => {
    const role = String(req.user?.role || "").toUpperCase();
    if (role === "CUSTOMER") {
      return customerWalletController.getMyWallet(req, res, next);
    }
    return shopWalletController.getWalletSummary(req, res, next);
  }
);

router.post(
  "/credit",
  idempotency,
  allowRoles("OWNER", "STAFF", "ADMIN"),
  shopWalletController.topupWallet
);

router.post(
  "/debit",
  idempotency,
  allowRoles("OWNER", "STAFF", "ADMIN"),
  shopWalletController.transferWallet
);

module.exports = router;
