const axios = require("axios");

axios.post("http://localhost:5000/api/payments/webhook", {
  gateway: "SSLCOMMERZ",
  trx_id: "TXN123456",
  status: "SUCCESS",
  amount: 40,
  currency: "BDT"
})
.then(res => {
  console.log("✅ RESPONSE:", res.data);
})
.catch(err => {
  console.error("❌ ERROR:", err.response?.data || err.message);
});
