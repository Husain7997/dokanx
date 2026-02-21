const verify = require("./webhook.verify");
const paymentService =
require("../../services/payment.service");

exports.handle = async (req, res) => {
  const sig = req.headers["x-signature"];

  const valid = verify(
    JSON.stringify(req.body),
    sig
  );

  if (!valid)
    return res.status(401).json({
      message: "Invalid signature",
    });

  await paymentService.handleWebhook(req.body);

  res.json({ received: true });
};
