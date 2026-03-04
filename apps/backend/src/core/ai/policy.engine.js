class PolicyEngine {

  async evaluateOrder(event) {
    return {
      allowed: true,
      action: "ANALYZE_CUSTOMER_VALUE"
    };
  }

  async evaluateInventory(event) {
    if (event.stock < 5) {
      return {
        allowed: true,
        action: "AUTO_REORDER"
      };
    }

    return { allowed: false };
  }

  async evaluateCustomer(event) {
    return {
      allowed: true,
      action: "SEND_PROMOTION"
    };
  }
}

module.exports = new PolicyEngine();