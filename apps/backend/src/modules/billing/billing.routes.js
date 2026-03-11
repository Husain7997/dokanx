const router = require("express").Router();
const { protect, allowRoles } = require("@/middlewares");
const { validateBody, validateParams } = require("@/middlewares/validateRequest");
const controller = require("./billing.controller");
const validator = require("./billing.validator");

router.use(protect, allowRoles("ADMIN"));

router.get("/plans", controller.listPlans);
router.post("/plans", validateBody(validator.validatePlanBody), controller.createPlan);
router.put("/plans/:planId", validateParams(validator.validateIdParam), validateBody(validator.validatePlanBody), controller.updatePlan);
router.delete("/plans/:planId", validateParams(validator.validateIdParam), controller.deletePlan);

router.get("/subscriptions", controller.listSubscriptions);
router.post("/subscriptions/assign", validateBody(validator.validateSubscriptionAssignBody), controller.assignSubscription);

router.get("/commission-rules", controller.listCommissionRules);
router.post("/commission-rules", validateBody(validator.validateCommissionRuleBody), controller.createCommissionRule);
router.put("/commission-rules/:ruleId", validateParams(validator.validateIdParam), validateBody(validator.validateCommissionRuleBody), controller.updateCommissionRule);
router.delete("/commission-rules/:ruleId", validateParams(validator.validateIdParam), controller.deleteCommissionRule);

router.get("/routing-rules", controller.listPaymentRoutingRules);
router.post("/routing-rules", validateBody(validator.validateRoutingRuleBody), controller.createPaymentRoutingRule);
router.put("/routing-rules/:ruleId", validateParams(validator.validateIdParam), validateBody(validator.validateRoutingRuleBody), controller.updatePaymentRoutingRule);
router.delete("/routing-rules/:ruleId", validateParams(validator.validateIdParam), controller.deletePaymentRoutingRule);

router.get("/sms-packs", controller.listSmsPacks);
router.post("/sms-packs", validateBody(validator.validateSmsPackBody), controller.createSmsPack);
router.put("/sms-packs/:packId", validateParams(validator.validateIdParam), validateBody(validator.validateSmsPackBody), controller.updateSmsPack);
router.delete("/sms-packs/:packId", validateParams(validator.validateIdParam), controller.deleteSmsPack);

router.post("/preview/commission", validateBody(validator.validatePreviewCommissionBody), controller.previewCommission);
router.post("/preview/payment-routing", validateBody(validator.validatePreviewPaymentRoutingBody), controller.previewPaymentRouting);

module.exports = router;
