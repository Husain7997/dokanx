const express = require("express");
const router = express.Router();

const settingsController = require("../controllers/settings.controller");

router.get("/eta", settingsController.getEtaSettings);
router.get("/risk", settingsController.getRiskSettings);

module.exports = router;
