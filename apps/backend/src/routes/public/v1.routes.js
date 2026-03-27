const router = require("express").Router();
const { publicApiGateway } = require("../../modules/api-gateway/api-gateway.middleware");
const { requireScopes } = require("../../modules/api-gateway/api-gateway.service");
const publicLogger = require("../../middlewares/publicApiLogger.middleware");
const controller = require("../../controllers/public-api.controller");

router.use(publicApiGateway);
router.use(publicLogger);

router.get("/products", requireScopes("read_products"), controller.listProducts);
router.get("/products/:productId", requireScopes("read_products"), controller.getProduct);
router.post("/orders", requireScopes("write_orders"), controller.createOrder);
router.get("/customers", requireScopes("read_customers"), controller.listCustomers);
router.get("/inventory", requireScopes("read_inventory"), controller.listInventory);

router.get("/wallets", requireScopes("read_wallet"), controller.getWalletSummary);
router.post("/wallets/credit", requireScopes("write_wallet"), controller.creditWallet);
router.post("/wallets/debit", requireScopes("write_wallet"), controller.debitWallet);
router.post("/payments/initiate", requireScopes("manage_payments"), controller.initiatePayment);
router.get("/shipping/rates", requireScopes("read_shipping"), controller.shippingRates);

module.exports = router;
