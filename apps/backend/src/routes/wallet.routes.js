// src/routes/wallet.routes.js

const router = require("express").Router();

const idempotency =
  require("../core/idempotency/idempotency.middleware");
const { validateBody } = require("../middlewares/validateRequest");
const validator = require("../validators/legacyRoutes.validator");

const controller =
  require("../controllers/shop/wallet.controller");

router.post(
  "/credit",
  idempotency,
  validateBody(validator.validateWalletTopupBody),
  controller.topupWallet
);

router.post(
  "/debit",
  idempotency,
  validateBody(validator.validateWalletTransferBody),
  controller.transferWallet
);

module.exports = router;
