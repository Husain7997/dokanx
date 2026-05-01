const IpBlock = require("../models/ipBlock.model");
const { getRequestIp } = require("../services/securityResponse.service");

module.exports = async function ipBlockMiddleware(req, res, next) {
  const ip = getRequestIp(req);
  if (!ip || ip === "unknown") {
    return next();
  }

  const block = await IpBlock.findOne({ ip, status: "BLOCKED" }).lean();
  if (!block) {
    return next();
  }

  const blockedUntil = block.blockedUntil ? new Date(block.blockedUntil) : null;
  if (blockedUntil && blockedUntil.getTime() <= Date.now()) {
    await IpBlock.updateOne(
      { _id: block._id },
      { $set: { status: "UNBLOCKED", unblockedAt: new Date() } }
    );
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "IP blocked by security policy",
    reason: block.reason || "Security block active",
  });
};
