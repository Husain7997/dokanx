const CheckoutEngine =
  require("@/core/checkout/checkout.engine");

exports.checkout = async (req, res) => {

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
};