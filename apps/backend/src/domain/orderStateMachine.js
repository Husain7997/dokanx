const transitions = {

  PLACED: [
    "PAYMENT_PENDING",
    "CANCELLED",
  ],

  PAYMENT_PENDING: [
    "CONFIRMED",
    "FAILED",
    "CANCELLED",
  ],

  CONFIRMED: [
    "SHIPPED",
    "CANCELLED",
  ],

  SHIPPED: [
    "DELIVERED",
  ],

  DELIVERED: [
    "REFUNDED",
  ],

  CANCELLED: [],
  REFUNDED: [],
  FAILED: [],
};

exports.canTransition = (from, to) => {
  return transitions[from]?.includes(to);
};

exports.transitions = transitions;