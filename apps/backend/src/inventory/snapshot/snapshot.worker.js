const cron = require("node-cron");
const Product = require("../../models/product.model");
const { createSnapshot } = require("./snapshot.service");

const { safeWorker } = require("@/system/workerWrapper");

const startSnapshotWorker = safeWorker(async () => {
  console.log("Snapshot worker started");

 cron.schedule("0 2 * * *", async () => {
    const products = await Product.find({}, "_id");

    for (const p of products) {
      await createSnapshot(p._id);
    }
  });

  console.log("Snapshot worker completed");
});

module.exports = { startSnapshotWorker };
