// services/payout.service.js

const ShopWallet = require('../models/ShopWallet');
const Payout = require('../models/Payout');
const Ledger = require('../models/Ledger');
const mongoose = require('mongoose');

async function processShopPayout(shopId, amount) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await ShopWallet.findOne({ shop: shopId }).session(session);

    if (!wallet || wallet.balance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Deduct from wallet
    wallet.balance -= amount;
    await wallet.save({ session });

    // Record Payout
    const payout = await Payout.create([{
      shop: shopId,
      amount
    }], { session });

    // Record Ledger entry
    await Ledger.create([{
      shop: shopId,
      type: 'DEBIT',
      amount,
      payoutId: payout[0]._id
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return { message: 'Payout successful', wallet };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

module.exports = { processShopPayout };






// const express = require('express');
// const router = express.Router();
// const settlementController = require('../controllers/settlement.controller');
// // const { createSettlement } = require('../controllers/settlement.controller');

// router.post('/:shopId/run', createSettlement);
// // router.post('/', createSettlement);
// router.post("/", (req, res) => {
//   return res.status(410).json({
//     message: "Settlement API disabled. Internal engine only.",
//   });
// });
// router.post('/:shopId', settlementController.createSettlement);
// router.post('/payout/:settlementId', settlementController.payoutSettlement);

// module.exports = router;












// =============================
// Settlement Routes (Future-ready)
// =============================

// const express = require("express");
// const router = express.Router();
// const settlementController = require("../controllers/settlement.controller");
// const { createSettlement, payoutSettlement } = settlementController;


// =============================
// Routes (currently disabled / placeholder)
// =============================

// // Internal test / run settlement
// router.post("/:shopId/run", createSettlement);

// // Default disabled route for API users
// router.post("/", (req, res) => {
//   return res.status(410).json({
//     message: "Settlement API disabled. Internal engine only.",
//   });
// });

// // Standard CRUD placeholder
// router.post("/:shopId", createSettlement);
// router.post("/payout/:settlementId", payoutSettlement);

// module.exports = router;
