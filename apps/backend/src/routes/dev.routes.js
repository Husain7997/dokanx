const router = require("express").Router();

const autoSettlement = require("../jobs/autoSettlement.job");

router.get("/run-settlement", async (req, res) => {
  await autoSettlement.runNow();
  res.send("Settlement executed");
});

module.exports = router;
