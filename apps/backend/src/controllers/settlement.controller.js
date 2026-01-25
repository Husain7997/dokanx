const Wallet = require("../models/wallet.model");
const Ledger = require("../models/ledger.model");
const mongoose = require("mongoose");


const { processShopSettlement } = require('../services/settlement.service');
const { payoutToShop } = require('../services/wallet.service');

const Settlement = require('../models/settlement.model');
const Shop = require('../models/shop.model');       // ✅ MISSING ছিল
const ShopWallet = require('../models/ShopWallet');

exports.createSettlement = async (req, res) => {
  try {
    const { shopId, totalAmount } = req.body;

    if (!shopId || !totalAmount) {
      return res.status(400).json({ message: 'shopId and totalAmount required' });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    const wallet = await ShopWallet.findOne({ shop: shopId });
    if (!wallet) {
      return res.status(404).json({ message: 'Shop wallet not found' });
    }

    const settlement = await Settlement.create({
      shop: shopId,
      totalAmount,
      status: 'pending', // ✅ enum match
    });

    return res.status(200).json(settlement);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};



exports.payoutSettlement = async (req, res) => {
  try {
    const result = await payoutToShop(req.params.settlementId, req.body.bankDetails);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};









// =============================
// Settlement Controller (Future-ready)
// =============================

// const mongoose = require("mongoose");
// const Settlement = require("../models/settlement.model");
// const Shop = require("../models/shop.model");
// const ShopWallet = require("../models/ShopWallet");
// const { processShopSettlement } = require("../services/settlement.service");
// const { payoutToShop } = require("../services/wallet.service");


// =============================
// Create Settlement (Internal use / placeholder)
// =============================
// exports.createSettlement = async (req, res) => {
//   try {
//     const { shopId, totalAmount } = req.body;

//     if (!shopId || !totalAmount) {
//       return res.status(400).json({ message: "shopId and totalAmount required" });
//     }

//     const shop = await Shop.findById(shopId);
//     if (!shop) {
//       return res.status(404).json({ message: "Shop not found" });
//     }

//     const wallet = await ShopWallet.findOne({ shop: shopId });
//     if (!wallet) {
//       return res.status(404).json({ message: "Shop wallet not found" });
//     }

//     const settlement = await Settlement.create({
//       shop: shopId,
//       totalAmount,
//       status: "pending", // enum match
//     });

//     return res.status(200).json(settlement);
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: err.message });
//   }
// };


// Payout Settlement (Internal use / placeholder)
// =============================
// exports.payoutSettlement = async (req, res) => {
//   try {
//     const result = await payoutToShop(req.params.settlementId, req.body.bankDetails);
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
