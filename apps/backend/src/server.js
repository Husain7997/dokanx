require("dotenv").config();
const mongoose = require("mongoose");
const cron = require("node-cron");
const app = require("./app");
// const connectDB = require("./config/db");
const { processSettlements } = require("./modules/settlement/settlement.cron");

(async () => {
  // await connectDB();
 if (process.env.NODE_ENV !== "test") {
    const cron = require("node-cron");
    const { processSettlements } = require("./modules/settlement/settlement.cron");

    cron.schedule("0 * * * *", async () => {
      console.log("⏰ Running settlement cron...");
      await processSettlements();
    });
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () =>
    console.log(`🚀 DokanX running on port ${PORT}`)
  );
})();
