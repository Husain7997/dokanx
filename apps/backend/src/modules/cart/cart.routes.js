const router = require("express").Router();
const optionalAuth = require("@/middlewares/optionalAuth.middleware");
const { validateBody } = require("@/middlewares/validateRequest");
const controller = require("./cart.controller");
const validator = require("./cart.validator");

router.use(optionalAuth);

router.get("/", controller.getCart);
router.put("/", validateBody(validator.validateSaveCartBody), controller.saveCart);
router.delete("/", controller.clearCart);
router.post("/merge", validateBody(validator.validateMergeBody), controller.mergeCart);

module.exports = router;
