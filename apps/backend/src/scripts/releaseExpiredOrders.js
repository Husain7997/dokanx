require("dotenv").config();
const mongoose = require("mongoose");

const Order = require("../models/order.model");
const { releaseStock } = require("../services/Inventory.service");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const expiredOrders = await Order.find({
    status: "PENDING",
    createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) }, // 30 min
  });

  for (const order of expiredOrders) {
    for (const item of order.items) {
      await releaseStock({
        shopId: order.shop,
        productId: item.product,
        quantity: item.quantity,
        orderId: order._id,
      });
    }

    order.status = "EXPIRED";
    await order.save();
  }

  console.log(`Released ${expiredOrders.length} orders`);
  process.exit();
})();
