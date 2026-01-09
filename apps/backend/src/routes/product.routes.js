const express = require("express");
const router = express.Router();

const productController = require("../controllers/product.controller");
const { protect } = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const checkShopOwnership = require("../middlewares/checkShopOwnership");

console.log("createProduct TYPE:", typeof productController.createProduct);
console.log("createProduct VALUE:", productController.createProduct);

router.post(
  "/",
  protect,
  role("owner"),
  checkShopOwnership,
  productController.createProduct
);

router.get(
  "/shop/:shopId",
  productController.getProductsByShop
);

module.exports = router;
