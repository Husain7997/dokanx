const {
  buildWarehouseSnapshots,
  getLatestSnapshot,
} = require("../../analytics/analyticsWarehouse.service");

async function getOverview(req, res, next) {
  try {
    const { dateFrom, dateTo } = req.query || {};
    const [
      dailySales,
      trend,
      wallet,
      shipments,
      inventory,
      categorySplit,
      channelSplit,
      topProducts,
      customerRepeatRate,
      conversionFunnel,
    ] = await Promise.all([
      getLatestSnapshot({ shopId: null, metricType: "DAILY_SALES", dateFrom, dateTo }),
      getLatestSnapshot({ shopId: null, metricType: "TREND_ANALYTICS", dateFrom, dateTo }),
      getLatestSnapshot({ shopId: null, metricType: "WALLET_SUMMARY", dateFrom, dateTo }),
      getLatestSnapshot({ shopId: null, metricType: "SHIPMENT_STATUS", dateFrom, dateTo }),
      getLatestSnapshot({ shopId: null, metricType: "INVENTORY_SNAPSHOT", dateFrom, dateTo }),
      getLatestSnapshot({ shopId: null, metricType: "CATEGORY_SPLIT", dateFrom, dateTo }),
      getLatestSnapshot({ shopId: null, metricType: "CHANNEL_SPLIT", dateFrom, dateTo }),
      getLatestSnapshot({ shopId: null, metricType: "TOP_PRODUCTS", dateFrom, dateTo }),
      getLatestSnapshot({ shopId: null, metricType: "CUSTOMER_REPEAT_RATE", dateFrom, dateTo }),
      getLatestSnapshot({ shopId: null, metricType: "CONVERSION_FUNNEL", dateFrom, dateTo }),
    ]);

    return res.json({
      data: {
        dailySales: dailySales?.payload || [],
        trend: trend?.payload || { current: [] },
        wallet: wallet?.payload || { credits: 0, debits: 0, net: 0, transactionCount: 0 },
        shipments: shipments?.payload || { total: 0, delivered: 0, failed: 0, successRate: 0, byStatus: [] },
        inventory: inventory?.payload || {
          totalSkus: 0,
          totalStock: 0,
          totalReserved: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
        },
        categorySplit: categorySplit?.payload || [],
        channelSplit: channelSplit?.payload || [],
        topProducts: topProducts?.payload || [],
        customerRepeatRate: customerRepeatRate?.payload || {
          totalCustomers: 0,
          repeatCustomers: 0,
          repeatRate: 0,
        },
        conversionFunnel: conversionFunnel?.payload || [],
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function buildPlatformWarehouse(req, res, next) {
  try {
    const { dateFrom, dateTo } = req.body || {};
    await buildWarehouseSnapshots({ shopId: null, dateFrom, dateTo });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getOverview,
  buildPlatformWarehouse,
};
