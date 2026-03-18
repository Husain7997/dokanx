const router = require("express").Router();
const publicController = require("../../controllers/public-api.controller");
const { publicApiGateway } = require("./api-gateway.middleware");
const { requireScopes } = require("./api-gateway.service");

router.use(publicApiGateway);

router.get("/products", requireScopes("read_products"), publicController.listProducts);
router.get("/products/:productId", requireScopes("read_products"), publicController.getProduct);
router.get("/orders", requireScopes("read_orders"), publicController.listOrders);
router.post("/orders", requireScopes("write_orders"), publicController.createOrder);
router.get("/customers", requireScopes("read_customers"), publicController.listCustomers);
router.get("/shops", requireScopes("read_shops"), publicController.listShops);
router.get("/inventory", requireScopes("read_inventory"), publicController.listInventory);
router.get("/wallets", requireScopes("read_wallet"), publicController.getWalletSummary);
router.post("/wallets/credit", requireScopes("write_wallet"), publicController.creditWallet);
router.post("/wallets/debit", requireScopes("write_wallet"), publicController.debitWallet);
router.post("/payments/initiate", requireScopes("manage_payments"), publicController.initiatePayment);
router.get("/shipping/rates", requireScopes("read_shipping"), publicController.shippingRates);

module.exports = router;
