const Order = require("../../models/order.model");
const Settlement = require("../../models/settlement.model");

class ReportService {

  /**
   * Shop Financial Summary
   */
  async shopSummary(shopId) {
    const revenue = await Order.aggregate([
      { $match: { shop: shopId, status: "COMPLETED" } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const settlements = await Settlement.aggregate([
      { $match: { shop: shopId } },
      {
        $group: {
          _id: null,
          settledAmount: { $sum: "$amount" },
          totalSettlements: { $sum: 1 },
        },
      },
    ]);

    return {
      sales: revenue[0] || {},
      settlements: settlements[0] || {},
    };
  }

  /**
   * Admin Global KPI
   */
  async adminKPI() {
    const totalOrders = await Order.countDocuments();

    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, revenue: { $sum: "$totalAmount" } } },
    ]);

    const totalSettled = await Settlement.aggregate([
      { $group: { _id: null, settled: { $sum: "$amount" } } },
    ]);

    return {
      totalOrders,
      revenue: totalRevenue[0]?.revenue || 0,
      settled: totalSettled[0]?.settled || 0,
    };
  }

  /**
   * Settlement History
   */
  async settlementHistory(shopId) {
    return Settlement.find({ shop: shopId })
      .sort({ createdAt: -1 })
      .limit(50);
  }
}

module.exports = new ReportService();
