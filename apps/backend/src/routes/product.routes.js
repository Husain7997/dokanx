const express = require("express");
const router = express.Router();

const productController = require("../controllers/product.controller");
const { protect, allowRoles, requirePermissions } = require("../middlewares");
const checkShopOwnership = require("../middlewares/checkShopOwnership");
const { validateRequest } = require("../middlewares/validateRequest.middleware");
const { schemas } = require("../validation/security.schemas");

router.post(
  "/",
  protect,
  allowRoles("OWNER"),
  requirePermissions("PRODUCT_WRITE"),
  validateRequest(schemas.productCreate),
  checkShopOwnership,
  productController.createProduct
);

router.post(
  "/bulk",
  protect,
  allowRoles("OWNER"),
  requirePermissions("PRODUCT_WRITE"),
  validateRequest(schemas.productBulkCreate),
  checkShopOwnership,
  productController.bulkCreateProducts
);

router.get("/", productController.listProducts);

router.patch(
  "/:productId",
  protect,
  allowRoles("OWNER"),
  requirePermissions("PRODUCT_WRITE"),
  validateRequest(schemas.productUpdate),
  checkShopOwnership,
  productController.updateProduct
);

router.delete(
  "/:productId",
  protect,
  allowRoles("OWNER"),
  requirePermissions("PRODUCT_WRITE"),
  validateRequest(schemas.productDelete),
  checkShopOwnership,
  productController.deleteProduct
);

router.get("/shop/:shopId", productController.getProductsByShop);
router.get("/barcode/:barcode", productController.getProductByBarcode);

router.get(
  "/:productId/inventory",
  protect,
  allowRoles("OWNER", "STAFF", "ADMIN"),
  requirePermissions("PRODUCT_READ_INVENTORY"),
  validateRequest(schemas.productInventory),
  productController.getProductInventory
);

router.get("/:productId/reviews", productController.listProductReviews);
router.post(
  "/:productId/reviews",
  protect,
  allowRoles("CUSTOMER", "ADMIN"),
  requirePermissions("PRODUCT_REVIEW_CREATE"),
  validateRequest(schemas.productReview),
  productController.createProductReview
);
router.get("/:productId", productController.getProductDetail);

module.exports = router;
