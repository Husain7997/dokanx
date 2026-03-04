exports.recommend = anomaly => {

  if (anomaly === "QUEUE_CONGESTION")
    return {
      action: "SCALE_WORKERS",
      value: 2
    };

  if (anomaly === "HIGH_ERROR_RATE")
    return {
      action: "ENABLE_SAFE_MODE"
    };
};