const router = require("express").Router();
const { ownerShopAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody, validateQuery, validateParams } = require("@/middlewares/validateRequest");
const controller = require("./behavior.controller");
const validator = require("./behavior.validator");

router.use(...ownerShopAccess("OWNER", "ADMIN"));

router.get("/customer/:customerId", validateParams(validator.validateCustomerParams), controller.getCustomerInsight);
router.post("/scan", validateBody(validator.validateScanBody), controller.scanRisk);
router.get("/signals", validateQuery(validator.validateSignalsQuery), controller.listSignals);
router.post("/signals/:signalId/resolve", validateParams(validator.validateResolveParams), controller.resolveSignal);

module.exports = router;
