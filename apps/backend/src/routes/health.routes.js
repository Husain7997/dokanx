// src/routes/health.routes.js

const router = require("express").Router();

const {
  readinessCheck,
} = require("../infrastructure/monitoring/readiness.controller");

// basic liveness
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "DokanX",
  });
});

// readiness probe
router.get("/readiness", readinessCheck);

module.exports = router;
