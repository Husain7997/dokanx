const router = require("express").Router();
const {
  getSystemHealth,
  getSystemMetrics
} = require("@/platform/observability/systemHealth.service");

router.get("/health", async (_req, res, next) => {
  try {
    const data = await getSystemHealth();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/metrics", async (_req, res, next) => {
  try {
    const data = await getSystemMetrics();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
