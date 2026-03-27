const CheckoutEngine =
  require("@/core/checkout/checkout.engine");
const { logSearchEvent } = require("../services/search.service");

exports.checkout = async (req, res) => {

  const result =
    await CheckoutEngine.checkout({
      shopId: req.body.shopId || req.user.shopId,
      customerId: req.user.id,
      items: req.body.items,
      addressId: req.body.addressId || null,
      deliveryMode: req.body.deliveryMode || "standard",
      totalAmount: req.body.totalAmount,
      trafficType: req.traffic?.type || "marketplace",
      deliveryAddress: req.body.deliveryAddress || null,
      campaignId: req.body.campaignId || null,
      paymentMode: req.body.paymentMode || "ONLINE",
      notes: req.body.notes || "",
      multiShopGroup: req.body.multiShopGroup || null,
      metadata: {
        traffic: req.traffic || null,
      },
    });

  const searchId = req.headers["x-search-id"] ? String(req.headers["x-search-id"]) : null;
  const searchQuery = req.headers["x-search-query"] ? String(req.headers["x-search-query"]) : "";
  if (searchId) {
    await logSearchEvent({
      searchId,
      query: searchQuery,
      eventType: "CHECKOUT",
      userId: req.user?.id || null,
      shopId: req.user?.shopId || null,
      metadata: {
        items: Array.isArray(req.body.items) ? req.body.items.length : 0,
        totalAmount: Number(req.body.totalAmount || 0),
      },
    });
  }

  res.json({
    success: true,
    ...result
  });
};
