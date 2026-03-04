const cron = require("node-cron");
const Product = require("../../models/product.model");
const { createSnapshot } = require("./snapshot.service");

function startSnapshotWorker() {
  console.log("📦 Snapshot worker executed");
  cron.schedule("0 2 * * *", async () => {
    const products = await Product.find({}, "_id");

    for (const p of products) {
      await createSnapshot(p._id);
    }
  });
}

module.exports = { startSnapshotWorker };