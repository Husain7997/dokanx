const cron = require("node-cron");
const { generateReport } = require("../services/ai.service");
const { sendWhatsApp } = require("../infrastructure/notifications/sms.provider");

// Mock data fetch function
async function fetchDailyData() {
  // Replace with actual data fetching logic
  return {
    revenue: 12000,
    orders: 50,
    deliverySuccess: 80,
    topProduct: "Shoes"
  };
}

// Mock merchant list
async function getMerchants() {
  // Replace with actual merchant query
  return [{ id: "123", phone: "017xxxxxxxx" }];
}

async function sendDailyReport() {
  try {
    const data = await fetchDailyData();
    const report = await generateReport(data);

    const merchants = await getMerchants();
    for (const merchant of merchants) {
      await sendWhatsApp(merchant.phone, report);
    }

    console.log("Daily AI report sent to merchants");
  } catch (error) {
    console.error("Daily report job error:", error);
  }
}

// Schedule daily at 10 PM
cron.schedule("0 22 * * *", sendDailyReport);

console.log("AI Report Job scheduled");

module.exports = {
  sendDailyReport,
};