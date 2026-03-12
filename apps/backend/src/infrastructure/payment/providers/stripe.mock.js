exports.create = async () => ({
  paymentURL: "https://stripe.mock/checkout",
  sessionId: "STRIPE_" + Date.now(),
});
