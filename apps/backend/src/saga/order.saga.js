const saga = require("./saga.engine");
const eventBus = require("@/infrastructure/events/eventBus"); 
eventBus.on("*", async (event) => {
  await saga.execute(event);
});
saga.register("ORDER_CREATED", async (event) => {

  console.log("Saga → reserve inventory");

});

saga.register("PAYMENT_SUCCESS", async (event) => {

  console.log("Saga → confirm order");

});