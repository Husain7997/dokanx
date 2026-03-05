const Settlement = require("../models/settlement.model");
const Shop = require("../models/shop.model");
const ShopWallet = require("../models/ShopWallet");
const { processSettlement } = require("../services/settlement.service");
const { processPayout } = require("../services/payout.service");

exports.createSettlement = async (req, res) => {
  try {
    const { shopId, totalAmount } = req.body;
    if (!shopId || !totalAmount) return res.status(400).json({ message: "shopId and totalAmount required" });

    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const wallet = await ShopWallet.findOne({ shopId: shopId });
    if (!wallet) return res.status(404).json({ message: "Shop wallet not found" });

    const settlement = await Settlement.create({
      shopId: shopId,
      totalAmount,
      netAmount: totalAmount,
      orderCount: 0,
      status: "PENDING",
    });

    await processSettlement({
      shopId,
      grossAmount: totalAmount,
      fee: 0,
      idempotencyKey: `SETTLEMENT_${settlement._id}`
    });

    res.json(settlement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.payoutSettlement = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ error: "Settlement not found" });
    }
    const result = await processPayout({ shopId: settlement.shopId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
