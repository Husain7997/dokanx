const router =
  require("express").Router();

const ctrl =
  require("@/controllers/checkout.controller");

const { protect } =
  require("@/middlewares");

router.use(protect);

router.post("/", ctrl.checkout);

module.exports = router;