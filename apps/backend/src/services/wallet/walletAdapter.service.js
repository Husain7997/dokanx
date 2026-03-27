const Wallet = require("../../models/wallet.model");
const logger = require("../../infrastructure/logger/logger");

async function findOne(query, options = {}) {
  return Wallet.findOne(query, options.projection || null, options.queryOptions || {});
}

async function findById(id, projection = null) {
  return Wallet.findById(id).select(projection || "");
}

async function findOneLean(query, projection = null) {
  return Wallet.findOne(query).select(projection || "").lean();
}

async function findOneAndUpdate(query, update, options = {}) {
  const nextOptions = { ...options };
  if (Object.prototype.hasOwnProperty.call(nextOptions, "new")) {
    nextOptions.returnDocument = nextOptions.new ? "after" : "before";
    delete nextOptions.new;
  }
  return Wallet.findOneAndUpdate(query, update, nextOptions);
}

async function countDocuments(query = {}) {
  return Wallet.countDocuments(query);
}

async function aggregate(pipeline = []) {
  return Wallet.aggregate(pipeline);
}

async function ensureWallet(shopId, defaults = {}, options = {}) {
  return Wallet.findOneAndUpdate(
    { shopId },
    {
      $setOnInsert: {
        shopId,
        balance: 0,
        currency: defaults.currency || "BDT",
        status: "ACTIVE",
        isFrozen: false,
      },
    },
    { returnDocument: "after", upsert: true, session: options.session || null }
  );
}

function normalizeReference(input = {}) {
  const referenceId = input.referenceId || input.reference || null;
  if (input.reference && !input.referenceId) {
    logger.warn({ reference: input.reference }, "Wallet adapter normalized legacy reference field");
  }
  return {
    ...input,
    referenceId,
  };
}

module.exports = {
  aggregate,
  countDocuments,
  ensureWallet,
  findById,
  findOne,
  findOneAndUpdate,
  findOneLean,
  normalizeReference,
};
