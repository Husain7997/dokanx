const bkash = require("./providers/bkash.mock");
const ssl = require("./providers/sslcommerz.mock");
const stripe = require("./providers/stripe.mock");

exports.createPayment = async (gateway, payload) => {
  if (gateway === "bkash")
    return bkash.create(payload);

  if (gateway === "ssl")
    return ssl.create(payload);

  if (gateway === "stripe")
    return stripe.create(payload);

  throw new Error("Unsupported gateway");
};
