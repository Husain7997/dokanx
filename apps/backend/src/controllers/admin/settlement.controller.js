const Settlement = require("../../models/settlement.model");
const { triggerPayout } = require("../../services/payout.service");
const { addJob } = require("@/core/infrastructure");

exports.listSettlements = async (req, res) => {
  const settlements = await Settlement.find().sort({ createdAt: -1 }).limit(100);
  res.json({ data: settlements });
};

exports.triggerManualPayout = async (req, res) => {
  const { settlementId } = req.params;
  const settlement = await Settlement.findById(settlementId);
  if (!settlement) return res.status(404).json({ message: "Settlement not found" });
  if (settlement.payoutRef) return res.status(400).json({ message: "Already paid out" });
  
  await addJob("settlement", { settlementId: settlement._id });

  await triggerPayout({ settlementId: settlement._id });
  res.json({ message: "Payout triggered" });
};

exports.retryPayout = async (req, res) => {
  const { settlementId } = req.params;
  const settlement = await Settlement.findById(settlementId);
  if (!settlement) return res.status(404).json({ message: "Settlement not found" });
  await triggerPayout({ settlementId: settlement._id }, { idempotencyKey: `retry_${settlement._id}` });
  res.json({ message: "Retry initiated" });
};

exports.processSettlement = async (req, res) => {
  const { settlementId } = req.body;
  res.json({ message: `Settlement ${settlementId} processed` });
};
