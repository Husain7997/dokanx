const router = require("express").Router();
const { ownerShopAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody, validateQuery, validateParams } = require("@/middlewares/validateRequest");
const controller = require("./credit.controller");
const validator = require("./credit.validator");

router.use(...ownerShopAccess("OWNER", "ADMIN"));

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
