const TaxRule = require("../models/TaxRule");
const Ledger = require("../models/ledger.model");

exports.applyTax = async ({ shopId, amount }) => {
  const rule = await TaxRule.findOne({ active: true });
  if (!rule) throw new Error("No active tax rule");

  let taxAmount = 0;

  if (rule.type === "PERCENTAGE") {
    taxAmount = (amount * rule.rate) / 100;
  }

  const ledger = await Ledger.create({
    shopId,
    amount: taxAmount,
    type: "DEBIT",
    source: "TAX",
    reference: "TAX-" + Date.now(),
  });

  return {
    taxAmount,
    ledger,
  };
};
