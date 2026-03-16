const router = require("express").Router();
const controller = require("../controllers/cart.controller");

router.get("/", controller.getCart);
router.put("/", controller.saveCart);
router.delete("/", controller.clearCart);
router.post("/merge", controller.mergeCart);
router.post("/coupon", controller.applyCoupon);
router.delete("/coupon", controller.removeCoupon);

module.exports = router;
