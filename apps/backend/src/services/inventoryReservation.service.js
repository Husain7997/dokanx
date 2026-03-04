const inventory = require("@/inventory");



/**
 * ==========================
 * RESERVE STOCK
 * ==========================
 */
async function reserveStock({
  productId,
  shopId,
  quantity,
  orderId
}) {

  return inventory.createInventoryEntry({
    shopId,
    productId,
    quantity,
    type: "RESERVATION",
    direction: "OUT",
    referenceId: orderId
  });

}


/**
 * ==========================
 * RELEASE RESERVATION
 * ==========================
 */
async function releaseReservation({
  shopId,
  items,
  orderId
}) {

  for (const item of items) {

    await inventory.createInventoryEntry({
      shopId,
      productId: item.product,
      quantity: item.quantity,
      type: "ORDER_CANCEL",
      direction: "IN",
      referenceId: orderId
    });

  }

}


/**
 * ==========================
 * CONFIRM SALE
 * ==========================
 */
async function confirmReservation({
  shopId,
  items,
  orderId
}) {

  for (const item of items) {

    await inventory.createInventoryEntry({
      shopId,
      productId: item.product,
      quantity: item.quantity,
      type: "ORDER_COMMIT",
      direction: "OUT",
      referenceId: orderId
    });

  }

}

module.exports = {
  // reserveStock,
  // releaseReservation,
  // confirmReservation
};