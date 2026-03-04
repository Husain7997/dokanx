const router = require("express").Router();

const simulator = require("@/testing/financial.simulator");
const integrity = require("@/testing/ledger.integrity.service");
const rebuild = require("@/testing/ledger.rebuild.service");
const detector = require("@/testing/corruption.detector");

router.post("/simulate/:shopId", async (req, res) => {
  const result = await simulator.simulate(req.params.shopId);
  res.json(result);
});

router.get("/verify/:shopId", async (req, res) => {
  const result = await integrity.verifyShop(req.params.shopId);
  res.json(result);
});

router.post("/rebuild/:shopId", async (req, res) => {
  const result = await rebuild.rebuild(req.params.shopId);
  res.json(result);
});

router.get("/scan", async (req, res) => {
  const result = await detector.scanAll();
  res.json(result);
});

module.exports = router;