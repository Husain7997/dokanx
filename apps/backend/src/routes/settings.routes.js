const express = require("express");
const router = express.Router();

const settingsController = require("../controllers/settings.controller");

router.get("/eta", settingsController.getEtaSettings);

module.exports = router;
