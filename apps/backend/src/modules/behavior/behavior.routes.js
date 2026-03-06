const router = require("express").Router();
const { protect, allowRoles } = require("@/middlewares");
const checkShopOwnership = require("@/middlewares/checkShopOwnership");
const { tenantGuard } = require("@/api/middleware/tenantGuard");
const { validateBody, validateQuery, validateParams } = require("@/middlewares/validateRequest");
const controller = require("./behavior.controller");
const validator = require("./behavior.validator");

router.use(protect);
router.use(tenantGuard);
router.use(allowRoles("OWNER", "ADMIN"));
router.use(checkShopOwnership);

router.get("/customer/:customerId", validateParams(validator.validateCustomerParams), controller.getCustomerInsight);
router.post("/scan", validateBody(validator.validateScanBody), controller.scanRisk);
router.get("/signals", validateQuery(validator.validateSignalsQuery), controller.listSignals);
router.post("/signals/:signalId/resolve", validateParams(validator.validateResolveParams), controller.resolveSignal);

module.exports = router;
