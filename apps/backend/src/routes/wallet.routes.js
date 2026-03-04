// src/routes/wallet.routes.js

const router = require("express").Router();

const idempotency =
  require("../core/idempotency/idempotency.middleware");

const controller =
  require("../controllers/shop/wallet.controller");

router.post(
  "/credit",
  idempotency,
  controller.topupWallet
);

router.post(
  "/debit",
  idempotency,
  controller.transferWallet
);

module.exports = router;