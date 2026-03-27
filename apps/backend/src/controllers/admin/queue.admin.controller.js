const { getQueueStatus } = require("@/core/infrastructure");

exports.getQueueStatus = async (_req, res) => {
  const status = await getQueueStatus();
  res.json({ data: status });
};
