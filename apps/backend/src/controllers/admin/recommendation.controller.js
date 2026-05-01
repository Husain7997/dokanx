const Event = require("../../models/event.model");
const Product = require("../../models/product.model");

function toDateRange(days) {
  const windowDays = Number(days || 7);
  const safeDays = Number.isFinite(windowDays) ? Math.max(1, Math.min(windowDays, 90)) : 7;
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  return { since, days: safeDays };
}

exports.getRecommendationMetrics = async (req, res, next) => {
  try {
    const { since, days } = toDateRange(req.query?.days);

    const [
      impressions,
      clicks,
      views,
      topClicks,
      impressionBySection,
      clickBySection,
      storefrontSectionImpressions,
      storefrontSectionClicks,
    ] = await Promise.all([
      Event.countDocuments({ type: "REC_IMPRESSION", createdAt: { $gte: since } }),
      Event.countDocuments({ type: "REC_CLICK", createdAt: { $gte: since } }),
      Event.countDocuments({ type: "PRODUCT_VIEW", createdAt: { $gte: since } }),
      Event.aggregate([
        { $match: { type: "REC_CLICK", createdAt: { $gte: since }, aggregateId: { $ne: null } } },
        { $group: { _id: "$aggregateId", clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } },
        { $limit: 10 },
      ]),
      Event.aggregate([
        { $match: { type: "REC_IMPRESSION", createdAt: { $gte: since } } },
        { $group: { _id: { $ifNull: ["$payload.context", "unknown"] }, impressions: { $sum: 1 } } },
      ]),
      Event.aggregate([
        { $match: { type: "REC_CLICK", createdAt: { $gte: since } } },
        { $group: { _id: { $ifNull: ["$payload.context", "unknown"] }, clicks: { $sum: 1 } } },
      ]),
      Event.aggregate([
        { $match: { type: "STOREFRONT_SECTION_IMPRESSION", createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              sectionId: { $ifNull: ["$payload.sectionId", "unknown"] },
              sectionType: { $ifNull: ["$payload.sectionType", "unknown"] },
              themeId: { $ifNull: ["$payload.themeId", "unknown"] },
            },
            impressions: { $sum: 1 },
          },
        },
      ]),
      Event.aggregate([
        { $match: { type: "STOREFRONT_SECTION_CTA_CLICK", createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              sectionId: { $ifNull: ["$payload.sectionId", "unknown"] },
              sectionType: { $ifNull: ["$payload.sectionType", "unknown"] },
              themeId: { $ifNull: ["$payload.themeId", "unknown"] },
            },
            clicks: { $sum: 1 },
          },
        },
      ]),
    ]);

    const productIds = topClicks.map((row) => row._id);
    const products = await Product.find({ _id: { $in: productIds } })
      .select("_id name slug")
      .lean();
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    const topProducts = topClicks.map((row) => ({
      productId: row._id,
      name: productMap.get(String(row._id))?.name || "Product",
      slug: productMap.get(String(row._id))?.slug || null,
      clicks: row.clicks || 0,
    }));

    const impressionMap = new Map(
      impressionBySection.map((row) => [String(row._id || "unknown"), Number(row.impressions || 0)])
    );
    const clickMap = new Map(
      clickBySection.map((row) => [String(row._id || "unknown"), Number(row.clicks || 0)])
    );
    const sections = Array.from(new Set([...impressionMap.keys(), ...clickMap.keys()])).sort();
    const sectionBreakdown = sections.map((section) => {
      const sectionImpressions = impressionMap.get(section) || 0;
      const sectionClicks = clickMap.get(section) || 0;
      return {
        section,
        impressions: sectionImpressions,
        clicks: sectionClicks,
        ctr: sectionImpressions ? sectionClicks / sectionImpressions : 0,
      };
    });
    sectionBreakdown.sort((a, b) => b.impressions - a.impressions);

    const storefrontClickMap = new Map(
      storefrontSectionClicks.map((row) => [
        `${String(row?._id?.sectionId || "unknown")}::${String(row?._id?.themeId || "unknown")}`,
        Number(row.clicks || 0),
      ])
    );
    const storefrontSectionBreakdown = storefrontSectionImpressions
      .map((row) => {
        const sectionId = String(row?._id?.sectionId || "unknown");
        const themeId = String(row?._id?.themeId || "unknown");
        const key = `${sectionId}::${themeId}`;
        const sectionImpressions = Number(row.impressions || 0);
        const ctaClicks = storefrontClickMap.get(key) || 0;
        return {
          sectionId,
          sectionType: String(row?._id?.sectionType || "unknown"),
          themeId,
          impressions: sectionImpressions,
          ctaClicks,
          ctr: sectionImpressions ? ctaClicks / sectionImpressions : 0,
        };
      })
      .sort((a, b) => b.impressions - a.impressions);

    const storefrontSectionClicksTotal = storefrontSectionBreakdown.reduce(
      (sum, row) => sum + Number(row.ctaClicks || 0),
      0
    );
    const storefrontSectionImpressionsTotal = storefrontSectionBreakdown.reduce(
      (sum, row) => sum + Number(row.impressions || 0),
      0
    );

    return res.json({
      data: {
        windowDays: days,
        impressions,
        clicks,
        ctr: impressions ? clicks / impressions : 0,
        productViews: views,
        topClickedProducts: topProducts,
        sectionBreakdown,
        storefrontSections: {
          impressions: storefrontSectionImpressionsTotal,
          ctaClicks: storefrontSectionClicksTotal,
          ctr: storefrontSectionImpressionsTotal ? storefrontSectionClicksTotal / storefrontSectionImpressionsTotal : 0,
          breakdown: storefrontSectionBreakdown,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};
