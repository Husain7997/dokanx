const router = require("express").Router();
const { apiKeyAuth, requirePermissions } = require("../../middlewares/apiKeyAuth.middleware");
const publicLogger = require("../../middlewares/publicApiLogger.middleware");
const controller = require("../../controllers/public-api.controller");

router.use(apiKeyAuth);
router.use(publicLogger);

router.get("/products", requirePermissions("read_products"), controller.listProducts);
router.get("/products/:productId", requirePermissions("read_products"), controller.getProduct);
router.post("/orders", requirePermissions("write_orders"), controller.createOrder);
router.get("/customers", requirePermissions("read_customers"), controller.listCustomers);
router.get("/inventory", requirePermissions("read_inventory"), controller.listInventory);

router.get("/wallets", controller.notImplemented);
router.post("/payments", controller.notImplemented);
router.get("/shipping", controller.notImplemented);

module.exports = router;
