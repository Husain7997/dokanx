const router = require("express").Router();
const inventoryController =
  require("../controllers/inventory.controller");

const protect = require("../middlewares/protect");

router.post(
  "/adjust",
  protect,
  inventoryController.adjustStock
);

module.exports = router;