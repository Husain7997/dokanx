const router = require("express").Router();
const {
  adjustStock,
  getLowStockAlerts,
} = require("../controllers/inventory.controller");

const { protect } = require("../middlewares");
const { validateBody, validateQuery } = require("../middlewares/validateRequest");
const inventoryValidator = require("../validators/inventory.validator");
const legacyValidator = require("../validators/legacyRoutes.validator");

router.get(
  "/alerts",
  protect,
  validateQuery(inventoryValidator.validateLowStockAlertQuery),
  getLowStockAlerts,
);

router.post(
  "/adjust",
  protect,
  validateBody(legacyValidator.validateInventoryAdjustBody),
  adjustStock,
);

module.exports = router;
