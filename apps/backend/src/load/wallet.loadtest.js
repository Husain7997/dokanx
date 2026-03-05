require("module-alias/register");
require("dotenv").config();

const mongoose = require("mongoose");
const { redisClient } = require("@/core/infrastructure");
const {
  registerWalletEvents,
  waitForWalletProjectionIdle
} = require("@/infrastructure/events/wallet.events");
const Wallet = require("@/models/wallet.model");
const { creditWallet, debitWallet } =
  require("@/services/wallet.service");

async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Load test DB connected");
}

const SHOP_ID = "69a1c8fa1a918f2bfe6ec9cc";
const TOTAL_REQUESTS = 2000;

function summarizeFailures(results) {
  const rejected = results.filter(r => r.status === "rejected");
  if (!rejected.length) return 0;

  const errorCounts = new Map();
  for (const item of rejected) {
    const reason =
      item.reason?.message ||
      String(item.reason || "Unknown failure");
    errorCounts.set(reason, (errorCounts.get(reason) || 0) + 1);
  }

  console.error(`Rejected tasks: ${rejected.length}`);
  for (const [reason, count] of errorCounts) {
    console.error(`- ${count}x ${reason}`);
  }

  return rejected.length;
}

async function runLoadTest() {
  await connectDB();
  registerWalletEvents();

  console.log("Load test started");

  // Seed wallet directly so debit pre-checks do not race projection lag.
  const seedAmount = TOTAL_REQUESTS * 10;
  await Wallet.findOneAndUpdate(
    { shopId: SHOP_ID },
    {
      $setOnInsert: {
        shopId: SHOP_ID,
        status: "ACTIVE",
        isFrozen: false
      },
      $inc: {
        balance: seedAmount,
        available_balance: seedAmount,
        withdrawable_balance: seedAmount
      }
    },
    { upsert: true, returnDocument: "after" }
  );

  const tasks = [];

  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    const ref = `load-${Date.now()}-${i}`;

    tasks.push(
      creditWallet({
        shopId: SHOP_ID,
        amount: 10,
        referenceId: ref
      })
    );

    tasks.push(
      debitWallet({
        shopId: SHOP_ID,
        amount: 5,
        referenceId: `${ref}-d`
      })
    );
  }

  const start = Date.now();
  const results = await Promise.allSettled(tasks);
  const failed = summarizeFailures(results);
  const end = Date.now();

  console.log(`Duration: ${(end - start) / 1000} sec`);
  console.log(
    failed
      ? "Load test finished with failures"
      : "Load test finished"
  );

  await waitForWalletProjectionIdle();
  await mongoose.disconnect();
  await redisClient.quit();
  process.exit(failed ? 1 : 0);
}

runLoadTest().catch(async (err) => {
  console.error("Load test crashed:", err);
  await mongoose.disconnect().catch(() => {});
  await redisClient.quit().catch(() => {});
  process.exit(1);
});
