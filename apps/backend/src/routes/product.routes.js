const express = require("express");
const router = express.Router();

const productController = require("../controllers/product.controller");
const { protect } = require("../middlewares");
const role = require("../middlewares/role.middleware");
const checkShopOwnership = require("../middlewares/checkShopOwnership");
const { tenantGuard } = require("@/api/middleware/tenantGuard");

router.post(
  "/smart-suggest",
  protect,
  tenantGuard,
  role("OWNER"),
  checkShopOwnership,
  productController.smartSuggest
);

router.post(
  "/",
  protect,
  tenantGuard,
  role("OWNER"),
  checkShopOwnership,
  productController.createProduct
);

router.get("/shop/:shopId", productController.getProductsByShop);

router.get(
  "/:productId/inventory",
  protect,
  tenantGuard,
  productController.getProductInventory
);

module.exports = router;
