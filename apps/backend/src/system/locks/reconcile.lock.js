const Lock = require("../models/lock.model");

/**
 * Distributed lock
 * Safe across cluster instances
 */

async function acquireLock(name, ttlMs = 60000) {

  const now = new Date();
  const expires = new Date(now.getTime() + ttlMs);

  try {

    const result = await Lock.findOneAndUpdate(
      {
        name,
        $or: [
          { expiresAt: { $lte: now } },
          { expiresAt: { $exists: false } },
        ],
      },
      {
        $set: { name, expiresAt: expires },
      },
      {
        upsert: true,
        new: true,
      }
    );

    // validate ownership
    return result.expiresAt.getTime() ===
      expires.getTime();

  } catch (err) {
    return false;
  }
}

async function releaseLock(name) {
  await Lock.deleteOne({ name });
}

module.exports = {
  acquireLock,
  releaseLock,
};