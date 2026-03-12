const router = require("express").Router();

const { protect, allowRoles } = require("@/middlewares");
const { validateBody } = require("@/middlewares/validateRequest");
const { tenantGuard } = require("@/api/middleware/tenantGuard");
const controller = require("./pos.controller");
const validator = require("./pos.validator");
const sessionValidator = require("./pos.session.validator");

router.use(protect);
router.use(tenantGuard);
router.use(allowRoles("OWNER", "ADMIN", "MANAGER", "STAFF"));

router.get("/sessions", controller.listSessions);
router.post("/sessions", validateBody(sessionValidator.validateOpenSessionBody), controller.openSession);
router.post("/sessions/:terminalId/close", controller.closeSession);
router.get("/offline/queue", controller.listOfflineQueue);
router.post("/offline/queue", validateBody(validator.validateQueuePayload), controller.enqueueOfflineSale);
router.post("/offline/sync", controller.syncOfflineQueue);

module.exports = router;
