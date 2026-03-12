const { canTransitionOrderStatus } = require("@/domain/orderStatus");

exports.canTransition = (from, to) => canTransitionOrderStatus(from, to);
