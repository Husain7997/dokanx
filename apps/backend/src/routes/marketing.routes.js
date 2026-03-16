const router = require("express").Router();
const { protect, allowRoles } = require("../middlewares");
const controller = require("../controllers/marketing.controller");

router.use(protect);
router.use(allowRoles("OWNER", "ADMIN", "STAFF"));

router.get("/campaigns", controller.listCampaigns);
router.post("/campaigns", controller.createCampaign);
router.patch("/campaigns/:campaignId", controller.updateCampaign);

module.exports = router;
