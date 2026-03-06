const router = require("express").Router();
const { protect, allowRoles } = require("@/middlewares");
const checkShopOwnership = require("@/middlewares/checkShopOwnership");
const { tenantGuard } = require("@/api/middleware/tenantGuard");
const { validateBody, validateQuery, validateParams } = require("@/middlewares/validateRequest");
const controller = require("./credit.controller");
const validator = require("./credit.validator");

router.use(protect);
router.use(tenantGuard);
router.use(allowRoles("OWNER", "ADMIN"));
router.use(checkShopOwnership);

router.get("/policy", controller.getPolicy);
router.post("/policy", validateBody(validator.validatePolicy), controller.upsertPolicy);

router.post("/customers", validateBody(validator.validateRegisterCustomer), controller.registerCustomer);
router.post("/issue", validateBody(validator.validateIssueOrPayment), controller.issueCredit);
router.post("/payment", validateBody(validator.validateIssueOrPayment), controller.receivePayment);

router.get("/customer/:customerId", validateParams(validator.validateCustomerParams), controller.getCustomerCredit);
router.get("/customer/:customerId/history", validateParams(validator.validateCustomerParams), controller.getCustomerCredit);
router.get("/due", validateQuery(validator.validateListQuery), controller.listDueAccounts);
router.get("/reminders/ready", validateQuery(validator.validateListQuery), controller.remindersReady);

module.exports = router;
