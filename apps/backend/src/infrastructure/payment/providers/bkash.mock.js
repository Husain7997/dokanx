exports.create = async () => ({
  paymentURL: "https://bkash.mock/pay",
  txnId: "BKASH_" + Date.now(),
});
