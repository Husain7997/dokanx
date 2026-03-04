const Product =
require("@/models/product.model");

async function applyProjection(event) {

  const {
    productId,
    quantity,
    direction,
    type
  } = event.payload;

  const stockChange =
    direction === "IN"
      ? quantity
      : -quantity;

  const update = {};

  if (type === "RESERVATION")
    update.$inc = { reserved: quantity };

  else if (type === "ORDER_CANCEL")
    update.$inc = { reserved: -quantity };

  else
    update.$inc = { stock: stockChange };

  await Product.updateOne(
    { _id: productId },
    update
  );

}

module.exports = {
  applyProjection
};