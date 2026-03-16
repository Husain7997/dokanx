const router = require("express").Router();
const { protect } = require("../middlewares");
const { allowRoles } = require("../middlewares");
const developerController = require("../controllers/developer.controller");
const apiKeyController = require("../controllers/apiKey.controller");
const oauthController = require("../controllers/oauth.controller");
const webhookController = require("../controllers/webhook.controller");

router.use(protect);
router.use(allowRoles("DEVELOPER", "ADMIN"));

router.get("/me", developerController.getMe);
router.put("/me", developerController.updateMe);
router.get("/analytics", developerController.getUsage);

router.get("/apps", oauthController.listApps);
router.post("/apps", oauthController.createApp);
router.patch("/apps/:appId", oauthController.updateApp);
router.delete("/apps/:appId", oauthController.deleteApp);

router.get("/api-keys", apiKeyController.listKeys);
router.post("/api-keys", apiKeyController.createKey);
router.delete("/api-keys/:keyId", apiKeyController.revokeKey);

router.get("/webhooks", webhookController.listWebhooks);
router.post("/webhooks", webhookController.createWebhook);
router.delete("/webhooks/:webhookId", webhookController.deleteWebhook);

module.exports = router;
