const inventory = require("@/inventory");


async function restock({
  productId,
  shopId,
  quantity,
  adminId
}) {
  return inventory.createInventoryEntry({
    productId,
    shopId,
    quantity,
    type: "RESTOCK",
    direction: "IN",
    referenceId: adminId
  });
}

// module.exports = { restock };