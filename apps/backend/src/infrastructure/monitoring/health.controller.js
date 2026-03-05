const {
  getSystemHealth,
  getSystemMetrics,
  getQueueDeadLetterMetrics
} = require("@/platform/observability/systemHealth.service");

exports.health = async (_req, res, next) => {
  try {
    const data = await getSystemHealth();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.metrics = async (_req, res, next) => {
  try {
    const data = await getSystemMetrics({
      tenantId: _req.query.tenantId || null,
      minutes: _req.query.minutes || 60
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.deadLetter = async (req, res, next) => {
  try {
    const size = Number(req.query.sampleSize || 10);
    const data = await getQueueDeadLetterMetrics(size);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
