const { verifyReconciliation } = require("@/services/financeAssurance.service");

async function runFinanceAssuranceJob(options = {}) {
  return verifyReconciliation(options);
}

module.exports = {
  runFinanceAssuranceJob,
};
