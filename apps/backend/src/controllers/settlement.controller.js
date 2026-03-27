const Settlement = require("../models/settlement.model");
const Shop = require("../models/shop.model");
const { processShopSettlement } = require("../services/settlement.service");
const { payoutToShop } = require("../services/wallet.service");
const walletAdapter = require("../services/wallet/walletAdapter.service");

exports.createSettlement = async (req, res) => {
  try {
    const { shopId, totalAmount } = req.body;
    if (!shopId || !totalAmount) return res.status(400).json({ message: "shopId and totalAmount required" });

    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const wallet = await walletAdapter.findOne({ shopId: shopId });
    if (!wallet) return res.status(404).json({ message: "Shop wallet not found" });

    const settlement = await Settlement.create({
      shopId: shopId,
      totalAmount,
      status: "pending",
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
    const result = await payoutToShop(settlementId, req.body.bankDetails);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
