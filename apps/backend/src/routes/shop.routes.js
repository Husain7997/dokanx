
const express = require("express");
const router = express.Router();

const { createShop } = require("../controllers/shop.controller");
const { protect } = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const { blockCustomer } = require("../controllers/shop.controller");


console.log("createShop TYPE:", typeof createShop);
console.log("createShop VALUE:", createShop);
router.put(
  "/:shopId/block-user/:userId",
  protect,
  role("owner"),
  blockCustomer
);

router.post(
  "/",
  protect,
  role("owner"),
  createShop
);
// router.get("/", protect, getMyShops);
module.exports = router;
