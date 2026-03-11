const router = require("express").Router();
const {adjustStock} =
  require("../controllers/inventory.controller");

const {protect} = require("../middlewares");
const { validateBody } = require("../middlewares/validateRequest");
const legacyValidator = require("../validators/legacyRoutes.validator");

router.post(
  "/adjust",
  protect,
  validateBody(legacyValidator.validateInventoryAdjustBody),
  adjustStock,
);

module.exports = router;
