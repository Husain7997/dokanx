const mongoose = require("mongoose");
const Settlement = require("../models/settlement.model");
const Order = require("../models/order.model");
const ShopWallet = require("../models/ShopWallet");
const Ledger = require("../models/ledger.model");

async function processShopSettlement(shopId, idempotencyKey) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Idempotency check
    const existing = await Settlement.findOne({
      shop: shopId,
      idempotencyKey,
    }).session(session);

    if (existing) {
      await session.commitTransaction();
      session.endSession();
      return existing;
    }

    // 2️⃣ Get unsettled successful orders
    const orders = await Order.find({
      shop: shopId,
      paymentStatus: "SUCCESS",
      isSettled: { $ne: true },
    }).session(session);

    if (!orders.length) {
      throw new Error("No unsettled orders found");
    }

    const grossAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const platformFee = Math.round(grossAmount * 0.05);
    const netPayable = grossAmount - platformFee;

    // 3️⃣ Create settlement record
    const settlement = await Settlement.create(
      [
        {
          shop: shopId,
          grossAmount,
          platformFee,
          netAmount: netPayable,
          orderCount: orders.length,
          idempotencyKey,
          status: "COMPLETED",
        },
      ],
      { session }
    );

    // 4️⃣ Wallet fetch (MANDATORY)
    let wallet = await ShopWallet.findOne({ shop: shopId }).session(session);
    if (!wallet) {
      wallet = await ShopWallet.create([{ shop: shopId, balance: 0 }], { session });
      wallet = wallet[0];
    }

    // 5️⃣ Wallet credit
    wallet.balance += netPayable;
    await wallet.save({ session });

    // 6️⃣ Ledger entry
    await Ledger.create(
      [
        {
          shopId,
          source: "SETTLEMENT",
          referenceType: "SETTLEMENT",
          referenceId: settlement[0]._id,
          amount: netPayable,       // ✅ netPayable ব্যবহার করুন
          type: "CREDIT",
          balanceAfter: wallet.balance,
        },
      ],
      { session }
    );

    // 7️⃣ Mark orders as settled
    await Order.updateMany(
      { _id: { $in: orders.map(o => o._id) } },  // ✅ এখানে orders আছে
      { $set: { isSettled: true } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return settlement[0];
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}


module.exports = {
  processShopSettlement,
};




// services/settlement.service.js



async function settleShopOrders(shopId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Fetch unsettled orders for this shop
    const unsettledOrders = await Order.find({
      shop: shopId,
      status: 'PAID',
      settled: false
    }).session(session);

    if (unsettledOrders.length === 0) {
      await session.commitTransaction();
      session.endSession();
      return { message: 'No orders to settle' };
    }

    // 2. Calculate total amount
    const totalAmount = unsettledOrders.reduce((sum, order) => sum + order.total, 0);

    // 3. Update ShopWallet
    const wallet = await ShopWallet.findOneAndUpdate(
      { shop: shopId },
      { $inc: { balance: totalAmount } },
      { new: true, upsert: true, session }
    );

    // 4. Record Settlement
    const settlement = await Settlement.create([{
      shop: shopId,
      amount: totalAmount,
      orders: unsettledOrders.map(o => o._id)
    }], { session });

    // 5. Update Ledger
    await Ledger.create([{
      shop: shopId,
      type: 'CREDIT',
      amount: totalAmount,
      settlementId: settlement[0]._id
    }], { session });

    // 6. Mark orders as settled
    await Order.updateMany(
      { _id: { $in: unsettledOrders.map(o => o._id) } },
      { $set: { settled: true } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return { message: 'Settlement complete', wallet };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

module.exports = { settleShopOrders };
