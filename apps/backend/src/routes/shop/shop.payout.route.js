const router = require("express").Router();

const { protect, allowRoles } = require("../../middlewares");
const { requestPayout } =
  require("../../controllers/shop/shopPayout.controller");

router.post(
  "/request",
  protect,
  allowRoles("OWNER", "ADMIN"),
  requestPayout
);

module.exports = router;
