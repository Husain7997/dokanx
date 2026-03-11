const CheckoutEngine =
  require("@/core/checkout/checkout.engine");
const { logger } = require("@/core/infrastructure");

exports.checkout = async (req, res, next) => {
  try {
    const result =
      await CheckoutEngine.checkout({
        shopId: req.user.shopId,
        customerId: req.user.id,
        items: req.body.items,
        totalAmount: req.body.totalAmount
      });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    logger.error({ err: err.message }, "Checkout failed");
    return next(err);
  }
};
