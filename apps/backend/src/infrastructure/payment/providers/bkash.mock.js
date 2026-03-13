exports.create = async (payload = {}) => {
  const txnId = "BKASH_" + Date.now();
  const callback = String(payload.callbackUrl || "");
  const paymentURL = callback
    ? `${callback}${callback.includes("?") ? "&" : "?"}status=SUCCESS&payment_id=${encodeURIComponent(payload.providerPaymentId || "")}&event_id=${encodeURIComponent(txnId)}&gateway=bkash`
    : "https://bkash.mock/pay";

  return {
    paymentURL,
    txnId,
  };
};
