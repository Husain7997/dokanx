const Wallet = require("../../models/wallet.model");

exports.freezeWallet = async (req, res) => {
  const { shopId } = req.params;
  if (!shopId) return res.status(400).json({ message: "shopId required" });

  const wallet = await Wallet.findOneAndUpdate(
    { shopId },
    { status: "FROZEN", isFrozen: true },
    { new: true, upsert: true }
  ).lean();

  res.json({ message: "Wallet frozen", data: wallet });
};

exports.unfreezeWallet = async (req, res) => {
  const { shopId } = req.params;
  if (!shopId) return res.status(400).json({ message: "shopId required" });

  const wallet = await Wallet.findOneAndUpdate(
    { shopId },
    { status: "ACTIVE", isFrozen: false },
    { new: true, upsert: true }
  ).lean();

  res.json({ message: "Wallet unfrozen", data: wallet });
};
