const {
  ORDER_STATUS_TRANSITIONS,
  canTransitionOrderStatus,
} = require("./orderStatus");

exports.canTransition = (from, to) => canTransitionOrderStatus(from, to);

exports.transitions = ORDER_STATUS_TRANSITIONS;
