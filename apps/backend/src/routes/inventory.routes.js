const router = require("express").Router();
const {adjustStock} =
  require("../controllers/inventory.controller");

const {protect} = require("../middlewares");

router.post(
  "/adjust",
  protect,
adjustStock,
);

module.exports = router;