await walletService.credit({
  shopId: order.shopId,
  amount: payment.amount,
  orderId: order._id,
  paymentId: payment._id,
  source: "ORDER_PAYMENT",
});

await walletService.recalculateBalance(order.shopId);
try {
  // credit logic
} catch (err) {
  if (err.code === 11000) {
    return res.status(200).json({
      message: "Duplicate ledger blocked",
    });
  }
  throw err;
}
