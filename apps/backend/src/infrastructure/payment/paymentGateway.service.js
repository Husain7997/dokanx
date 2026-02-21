const bkash = require("./providers/bkash.mock");
const ssl = require("./providers/sslcommerz.mock");

exports.createPayment = async (gateway, payload) => {
  if (gateway === "bkash")
    return bkash.create(payload);

  if (gateway === "ssl")
    return ssl.create(payload);

  throw new Error("Unsupported gateway");
};
