const { logger } = require("@/core/infrastructure");
const { runSyncTaskBatch } = require("@/modules/ads/adsCampaign.service");

async function pipeline() {
  try {
    const result = await runSyncTaskBatch({ limit: 20 });
    if (result.processed > 0) {
      logger.info(
        {
          processed: result.processed,
          synced: result.synced,
          failed: result.failed,
          retryScheduled: result.retryScheduled,
        },
        "ads sync task batch completed"
      );
    }
  } catch (err) {
    logger.error({ err: err.message }, "ads sync task batch failed");
  }
}

setInterval(pipeline, 15000);
