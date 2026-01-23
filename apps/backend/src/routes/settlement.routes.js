// const express = require('express');
// const router = express.Router();
// const settlementController = require('../controllers/settlement.controller');
// // const { createSettlement } = require('../controllers/settlement.controller');

// router.post('/:shopId/run', createSettlement);
// // router.post('/', createSettlement);
// router.post("/", (req, res) => {
//   return res.status(410).json({
//     message: "Settlement API disabled. Internal engine only.",
//   });
// });
// router.post('/:shopId', settlementController.createSettlement);
// router.post('/payout/:settlementId', settlementController.payoutSettlement);

// module.exports = router;












// =============================
// Settlement Routes (Future-ready)
// =============================

// const express = require("express");
// const router = express.Router();
// const settlementController = require("../controllers/settlement.controller");
// const { createSettlement, payoutSettlement } = settlementController;


// =============================
// Routes (currently disabled / placeholder)
// =============================

// // Internal test / run settlement
// router.post("/:shopId/run", createSettlement);

// // Default disabled route for API users
// router.post("/", (req, res) => {
//   return res.status(410).json({
//     message: "Settlement API disabled. Internal engine only.",
//   });
// });

// // Standard CRUD placeholder
// router.post("/:shopId", createSettlement);
// router.post("/payout/:settlementId", payoutSettlement);

// module.exports = router;
