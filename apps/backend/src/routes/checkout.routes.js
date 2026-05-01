const router =
  require("express").Router();

const ctrl =
  require("@/controllers/checkout.controller");
const idempotency =
  require("@/core/idempotency/idempotency.middleware");

const { protect } =
  require("@/middlewares");

router.use(protect);

router.post("/", idempotency, ctrl.checkout);

module.exports = router;
