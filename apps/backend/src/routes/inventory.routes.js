const router = require("express").Router();
const { adjustStock, listInventory, inventoryAlerts } =
  require("../controllers/inventory.controller");

const {protect} = require("../middlewares");

router.post(
  "/adjust",
  protect,
adjustStock,
);

router.post(
  "/",
  protect,
  adjustStock
);

router.get(
  "/",
  protect,
  listInventory
);

router.get(
  "/alerts",
  protect,
  inventoryAlerts
);

module.exports = router;
