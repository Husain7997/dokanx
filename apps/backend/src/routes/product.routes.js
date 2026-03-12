const express = require("express");
const router = express.Router();

const productController = require("../controllers/product.controller");
const { protect } = require("../middlewares");
const role = require("../middlewares/role.middleware");
const checkShopOwnership = require("../middlewares/checkShopOwnership");
const { tenantGuard } = require("@/api/middleware/tenantGuard");
const { validateBody, validateParams } = require("../middlewares/validateRequest");
const validator = require("../validators/productCheckout.validator");

router.post(
  "/smart-suggest",
  protect,
  tenantGuard,
  role("OWNER"),
  checkShopOwnership,
  validateBody(validator.validateSmartSuggestBody),
  productController.smartSuggest
);

router.post(
  "/",
  protect,
  tenantGuard,
  role("OWNER"),
  checkShopOwnership,
  validateBody(validator.validateProductCreateBody),
  productController.createProduct
);

router.patch(
  "/:productId",
  protect,
  tenantGuard,
  role("OWNER"),
  checkShopOwnership,
  validateParams(validator.validateProductIdParam),
  validateBody(validator.validateProductUpdateBody),
  productController.updateProduct
);

router.delete(
  "/:productId",
  protect,
  tenantGuard,
  role("OWNER"),
  checkShopOwnership,
  validateParams(validator.validateProductIdParam),
  productController.deleteProduct
);

router.get("/shop/:shopId", validateParams(validator.validateShopIdParam), productController.getProductsByShop);

router.get(
  "/:productId/inventory",
  protect,
  tenantGuard,
  validateParams(validator.validateProductIdParam),
  productController.getProductInventory
);

module.exports = router;
