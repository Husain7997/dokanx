exports.collect = async () => {

  return {
    queueLag: await queue.getWaitingCount(),
    failedJobs: await queue.getFailedCount(),
    errorRate: metrics.errors(),
    latency: metrics.latency()
  };

};