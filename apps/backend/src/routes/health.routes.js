// src/routes/health.routes.js

const router = require("express").Router();

// basic liveness
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "DokanX",
  });
});

module.exports = router;
