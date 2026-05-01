const IpBlock = require("../../models/ipBlock.model");
const SecurityEvent = require("../../models/securityEvent.model");

exports.listIpBlocks = async (_req, res) => {
  const blocks = await IpBlock.find().sort({ createdAt: -1 }).lean();
  res.json({ data: blocks });
};

exports.listSecurityEvents = async (_req, res) => {
  const events = await SecurityEvent.find().sort({ createdAt: -1 }).limit(500).lean();
  res.json({ data: events });
};

exports.blockIp = async (req, res) => {
  const { ip, reason } = req.body || {};
  if (!ip) return res.status(400).json({ message: "ip required" });

  const record = await IpBlock.findOneAndUpdate(
    { ip },
    {
      status: "BLOCKED",
      reason: reason || "",
      blockedBy: req.user?._id,
      unblockedBy: null,
      unblockedAt: null,
      blockedUntil: null,
      source: "MANUAL",
    },
    { returnDocument: "after", upsert: true }
  ).lean();

  res.json({ message: "IP blocked", data: record });
};

exports.unblockIp = async (req, res) => {
  const { id } = req.params;
  const record = await IpBlock.findByIdAndUpdate(
    id,
    { status: "UNBLOCKED", unblockedBy: req.user?._id, unblockedAt: new Date() },
    { returnDocument: "after" }
  ).lean();
  if (!record) return res.status(404).json({ message: "IP block not found" });
  res.json({ message: "IP unblocked", data: record });
};

