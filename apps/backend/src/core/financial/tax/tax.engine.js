const TaxRule = require("../../../models/TaxRule");
const Ledger = require("../../../modules/ledger/ledger.model");

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
    type: "debit",
    referenceId: "TAX-" + Date.now(),
    meta: {
      source: "TAX",
      ruleId: rule._id,
    },
  });

  return {
    taxAmount,
    ledger,
  };
};
