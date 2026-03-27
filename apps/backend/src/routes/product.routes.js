const express = require("express");
const router = express.Router();

const productController = require("../controllers/product.controller");
const { protect } = require("../middlewares");
const role = require("../middlewares/role.middleware");
const checkShopOwnership = require("../middlewares/checkShopOwnership");

router.post(
  "/",
  protect,
  role("OWNER"),
  checkShopOwnership,
  productController.createProduct
);

router.post(
  "/bulk",
  protect,
  role("OWNER"),
  checkShopOwnership,
  productController.bulkCreateProducts
);

router.get("/", productController.listProducts);

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

router.get("/shop/:shopId", productController.getProductsByShop);
router.get("/barcode/:barcode", productController.getProductByBarcode);

router.get(
  "/:productId/inventory",
  protect,
  productController.getProductInventory
);

router.get("/:productId/reviews", productController.listProductReviews);
router.post("/:productId/reviews", productController.createProductReview);
router.get("/:productId", productController.getProductDetail);

module.exports = router;
