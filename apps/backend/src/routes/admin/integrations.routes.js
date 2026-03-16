const router = require("express").Router();
const { protect, allowRoles } = require("../../middlewares");
const controller = require("../../controllers/admin/integrations.controller");

router.use(protect);
router.use(allowRoles("ADMIN"));

router.get("/", controller.listCredentials);
router.post("/", controller.upsertCredential);

module.exports = router;
