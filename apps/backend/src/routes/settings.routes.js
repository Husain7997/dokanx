const express = require("express");
const router = express.Router();

const settingsController = require("../controllers/settings.controller");

router.get("/eta", settingsController.getEtaSettings);
router.get("/risk", settingsController.getRiskSettings);
router.get("/thresholds", settingsController.getThresholdSettings);

module.exports = router;
