function normalizeType(type = "") {
  return String(type || "").trim().toLowerCase();
}

function calculateEntryDelta(entry = {}) {
  const amount = Number(entry.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  const type = normalizeType(entry.type);
  const reason = String(entry?.meta?.reason || "").trim().toLowerCase();

  if (reason === "wallet_credit") {
    return type === "credit" ? amount : 0;
  }

  if (reason === "wallet_debit") {
    return type === "debit" ? -amount : 0;
  }

  if (type === "credit") return amount;
  if (type === "debit") return -amount;
  return 0;
}

function calculateLedgerDelta(entries = []) {
  return entries.reduce(
    (sum, entry) => sum + calculateEntryDelta(entry),
    0
  );
}

module.exports = {
  calculateEntryDelta,
  calculateLedgerDelta,
};
