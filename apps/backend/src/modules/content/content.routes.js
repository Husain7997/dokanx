const router = require("express").Router();
const { tenantAccess } = require("@/middlewares/accessPolicy.middleware");
const { validateBody } = require("@/middlewares/validateRequest");
const controller = require("./content.controller");
const validator = require("./content.validator");

router.get("/pages", ...tenantAccess("OWNER", "ADMIN", "STAFF"), controller.listPages);
router.post("/pages", ...tenantAccess("OWNER", "ADMIN"), validateBody(validator.validatePageBody), controller.upsertPage);
router.get("/seo/rules", ...tenantAccess("OWNER", "ADMIN", "STAFF"), controller.listSeoRules);
router.post("/seo/rules", ...tenantAccess("OWNER", "ADMIN"), validateBody(validator.validateSeoRuleBody), controller.upsertSeoRule);
router.get("/experiments", ...tenantAccess("OWNER", "ADMIN", "STAFF"), controller.listExperiments);
router.post("/experiments", ...tenantAccess("OWNER", "ADMIN"), validateBody(validator.validateExperimentBody), controller.createExperiment);

module.exports = router;
