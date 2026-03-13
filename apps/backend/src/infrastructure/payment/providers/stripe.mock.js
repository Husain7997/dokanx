exports.create = async (payload = {}) => {
  const sessionId = "STRIPE_" + Date.now();
  const callback = String(payload.callbackUrl || "");
  const paymentURL = callback
    ? `${callback}${callback.includes("?") ? "&" : "?"}status=SUCCESS&payment_id=${encodeURIComponent(payload.providerPaymentId || "")}&event_id=${encodeURIComponent(sessionId)}&gateway=stripe`
    : "https://stripe.mock/checkout";

  return {
    paymentURL,
    sessionId,
  };
};
