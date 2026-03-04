exports.detect = stats => {

  if (stats.errorRate > 5)
    return "HIGH_ERROR_RATE";

  if (stats.queueLag > 1000)
    return "QUEUE_CONGESTION";

  return null;
};