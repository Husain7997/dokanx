const express = require("express");
const router = express.Router();

const productController = require("../controllers/product.controller");
const { protect } = require("../middlewares");
const role = require("../middlewares/role.middleware");
const checkShopOwnership = require("../middlewares/checkShopOwnership");
// const { resolveShop } = require("../middlewares/shop.middleware");
console.log("createProduct TYPE:", typeof productController.createProduct);
console.log("createProduct VALUE:", productController.createProduct);

router.post(
  "/",
  protect,        // 🔥 MUST FIRST
  // resolveShop,
  role("OWNER"),
  checkShopOwnership,
  productController.createProduct
);

router.patch(
  "/:productId",
  protect,
  role("OWNER"),
  checkShopOwnership,
  productController.updateProduct
);

router.delete(
  "/:productId",
  protect,
  role("OWNER"),
  checkShopOwnership,
  productController.deleteProduct
);

router.get(
  "/shop/:shopId",
  productController.getProductsByShop
);

router.get(
  "/:productId/inventory",
  protect,
  // resolveShop,
  productController.getProductInventory
);
module.exports = router;
