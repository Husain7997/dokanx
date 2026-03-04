function validateCheckout(data) {

  if (!data.items.length)
    throw new Error("Empty cart");

  return true;
}

module.exports = { validateCheckout };