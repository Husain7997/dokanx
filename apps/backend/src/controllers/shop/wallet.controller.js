const ShopWallet = require("../../models/ShopWallet");

exports.topupWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    const wallet = await ShopWallet.findOne({ shop: req.user._id });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    wallet.balance += amount;
    await wallet.save();
    res.json({ message: "Wallet topped up", balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.transferWallet = async (req, res) => {
  try {
    const { toShopId, amount } = req.body;
    const fromWallet = await ShopWallet.findOne({ shop: req.user._id });
    const toWallet = await ShopWallet.findOne({ shop: toShopId });
    if (!fromWallet || !toWallet) return res.status(404).json({ message: "Wallet not found" });
    if (fromWallet.balance < amount) return res.status(400).json({ message: "Insufficient balance" });

    fromWallet.balance -= amount;
    toWallet.balance += amount;
    await fromWallet.save();
    await toWallet.save();

    res.json({ message: "Transfer successful", fromBalance: fromWallet.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
