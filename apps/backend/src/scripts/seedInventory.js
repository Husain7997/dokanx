require("dotenv").config();
const mongoose = require("mongoose");

const InventoryLedger =
  require("../models/inventoryLedger.model");

async function run() {

  await mongoose.connect(process.env.MONGO_URI);

  /*
   STEP-1
   MongoDB Compass খুলুন
   shop _id copy করুন
   product _id copy করুন
  */

  const shopId =
    new mongoose.Types.ObjectId("PUT_REAL_SHOP_ID");

  const productId =
    new mongoose.Types.ObjectId("PUT_REAL_PRODUCT_ID");

  await InventoryLedger.create({
    shopId: shopId,
    product: productId,
    type: "RESTOCK",
    direction: "IN",
    quantity: 50,
    note: "Initial inventory seed"
  });

  console.log("✅ Inventory Seeded");

  process.exit();
}

run();