
const express = require("express");
const router = express.Router();

const { createShop } = require("../controllers/shop.controller");
const { protect } = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

console.log("createShop TYPE:", typeof createShop);
console.log("createShop VALUE:", createShop);

router.post(
  "/",
  protect,
  role("owner"),
  createShop
);
// router.get("/", protect, getMyShops);
module.exports = router;
