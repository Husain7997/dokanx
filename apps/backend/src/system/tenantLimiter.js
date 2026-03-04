function limit(shopPlan, usage) {

  if (shopPlan === "starter" && usage > 1000)
    throw new Error("Upgrade required");
}

module.exports = { limit };