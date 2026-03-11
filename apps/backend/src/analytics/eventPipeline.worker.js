const { logger } = require("@/core/infrastructure");
const { runSyncTaskBatch } = require("@/modules/ads/adsCampaign.service");

let isRunning = false;
let timer = null;
let stopped = false;

async function pipeline() {
  if (isRunning) {
    logger.warn("ads sync task batch skipped because previous run is still active");
    return;
  }

  isRunning = true;
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
  } finally {
    isRunning = false;
  }
}

async function loop() {
  if (stopped) return;
  await pipeline();
  timer = setTimeout(loop, 15000);
}

function shutdown() {
  stopped = true;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

loop();
