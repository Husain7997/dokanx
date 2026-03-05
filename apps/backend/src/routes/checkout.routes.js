const router =
  require("express").Router();

const ctrl =
  require("@/controllers/checkout.controller");
const { redisRateLimiter } =
  require("@/platform/rate-limit/redisRateLimiter");

const { protect } =
  require("@/middlewares");

router.use(protect);

router.post(
  "/",
  redisRateLimiter({ scope: "checkout", limit: 30, windowSec: 60 }),
  ctrl.checkout
);

module.exports = router;
