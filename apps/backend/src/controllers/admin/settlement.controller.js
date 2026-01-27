const Settlement = require("../../models/settlement.model");
const { triggerPayout } = require("../../services/payout.service");

exports.listSettlements = async (req, res) => {
  const settlements = await Settlement.find().sort({ createdAt: -1 }).limit(100);
  res.json({ data: settlements });
};

exports.triggerManualPayout = async (req, res) => {
  const { settlementId } = req.params;
  const settlement = await Settlement.findById(settlementId);
  if (!settlement) return res.status(404).json({ message: "Settlement not found" });
  if (settlement.payoutStatus === "SUCCESS") return res.status(400).json({ message: "Already paid out" });

  await triggerPayout(settlement._id);
  res.json({ message: "Payout triggered" });
};

exports.retryPayout = async (req, res) => {
  const { settlementId } = req.params;
  await triggerPayout(settlementId, { forceRetry: true });
  res.json({ message: "Retry initiated" });
};

exports.processSettlement = async (req, res) => {
  const { settlementId } = req.body;
  res.json({ message: `Settlement ${settlementId} processed` });
};
