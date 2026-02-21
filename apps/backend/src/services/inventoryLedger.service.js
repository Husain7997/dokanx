const InventoryLedger = require("../models/inventoryLedger.model");
const Product = require("../models/product.model");

async function createInventoryEntry({
  shop,
  product,
  type,
  quantity,
  direction,
  referenceId,
  referenceModel,
  userId,
  note,
}) {

  if (quantity <= 0)
    throw new Error("Invalid quantity");

  const session = await InventoryLedger.startSession();

  session.startTransaction();

  try {

    const ledger = await InventoryLedger.create([{
      shop,
      product,
      type,
      quantity,
      direction,
      referenceId,
      referenceModel,
      createdBy: userId,
      note,
    }], { session });

    const change =
      direction === "IN" ? quantity : -quantity;

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: product, shop },
      { $inc: { stock: change } },
      { new: true, session }
    );

    if (!updatedProduct)
      throw new Error("Product not found");

    if (updatedProduct.stock < 0)
      throw new Error("Stock cannot be negative");

    await session.commitTransaction();

    return ledger[0];

  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}



async function calculateRealStock(productId) {

  const result = await InventoryLedger.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        stock: {
          $sum: {
            $cond: [
              { $eq: ["$direction", "IN"] },
              "$quantity",
              { $multiply: ["$quantity", -1] },
            ],
          },
        },
      },
    },
  ]);

  return result[0]?.stock || 0;
}

module.exports = {
  createInventoryEntry,
  calculateRealStock,
};