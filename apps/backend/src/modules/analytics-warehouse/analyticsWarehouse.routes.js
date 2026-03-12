const router = require("express").Router();
const { tenantAccess } = require("@/middlewares/accessPolicy.middleware");
const controller = require("./analyticsWarehouse.controller");

router.get("/warehouse", ...tenantAccess("OWNER", "ADMIN"), controller.listSnapshots);
router.post("/warehouse/build", ...tenantAccess("OWNER", "ADMIN"), controller.buildSnapshots);

module.exports = router;
