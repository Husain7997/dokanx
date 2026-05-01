const Wallet = require("../../models/wallet.model");
const { createAudit } = require("../../utils/audit.util");

exports.freezeWallet = async (req, res) => {
  const { shopId } = req.params;
  const reason = String(req.body?.reason || "").trim();
  if (!shopId) return res.status(400).json({ message: "shopId required" });

  const wallet = await Wallet.findOneAndUpdate(
    { shopId },
    { status: "FROZEN", isFrozen: true },
    { returnDocument: "after", upsert: true }
  ).lean();

  await createAudit({
    performedBy: req.user?._id || null,
    action: "FREEZE_WALLET",
    targetType: "wallet",
    targetId: String(wallet?._id || shopId),
    req,
    meta: {
      shopId,
      reason: reason || null,
    },
  });

  res.json({ message: "Wallet frozen", data: wallet });
};

exports.unfreezeWallet = async (req, res) => {
  const { shopId } = req.params;
  const reason = String(req.body?.reason || "").trim();
  if (!shopId) return res.status(400).json({ message: "shopId required" });

  const wallet = await Wallet.findOneAndUpdate(
    { shopId },
    { status: "ACTIVE", isFrozen: false },
    { returnDocument: "after", upsert: true }
  ).lean();

  await createAudit({
    performedBy: req.user?._id || null,
    action: "UNFREEZE_WALLET",
    targetType: "wallet",
    targetId: String(wallet?._id || shopId),
    req,
    meta: {
      shopId,
      reason: reason || null,
    },
  });

  res.json({ message: "Wallet unfrozen", data: wallet });
};

