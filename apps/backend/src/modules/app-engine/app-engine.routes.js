const router = require("express").Router();
const { protect, allowRoles } = require("../../middlewares");
const developerAuthController = require("./developer-auth.controller");
const appEngineController = require("./app-engine.controller");

router.post("/developer/auth/register", developerAuthController.register);
router.post("/developer/auth/login", developerAuthController.login);

router.get("/admin/apps", protect, allowRoles("ADMIN"), appEngineController.listAdminApps);
router.post("/apps/install", protect, allowRoles("OWNER", "ADMIN"), appEngineController.installApp);
router.post("/apps/uninstall", protect, allowRoles("OWNER", "ADMIN"), appEngineController.uninstallApp);

module.exports = router;
