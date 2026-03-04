const eventBus = require("./eventBus");

eventBus.on("ORDER_CREATED", async (payload) => {
  console.log("ORDER_CREATED received", payload);
});

eventBus.on("PAYMENT_SUCCESS", async (payload) => {
  console.log("PAYMENT_SUCCESS received", payload);
});

console.log("✅ Event listeners registered");