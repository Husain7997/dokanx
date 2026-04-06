const CustomerComplaint = require("../models/customerComplaint.model");
const User = require("../models/user.model");

function resolveShopId(req) {
  return req.shop?._id || req.user?.shopId || null;
}

exports.listCustomerComplaints = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return res.status(400).json({ message: "Shop context required" });

    const filter = { shopId };
    if (req.query.customerId) filter.globalCustomerId = String(req.query.customerId);
    if (req.query.status) filter.status = String(req.query.status).toUpperCase();

    const complaints = await CustomerComplaint.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ data: complaints });
  } catch (error) {
    next(error);
  }
};

exports.createCustomerComplaint = async (req, res, next) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return res.status(400).json({ message: "Shop context required" });

    const { customerId, title, details, priority } = req.body || {};
    if (!customerId || !title) {
      return res.status(400).json({ message: "customerId and title are required" });
    }

    const customer = await User.findOne({ $or: [{ _id: customerId }, { globalCustomerId: customerId }] }).select("_id globalCustomerId").lean();
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const complaint = await CustomerComplaint.create({
      shopId,
      customerId: customer._id,
      globalCustomerId: customer.globalCustomerId || String(customer._id),
      title: String(title).trim(),
      details: String(details || "").trim(),
      priority: String(priority || "MEDIUM").toUpperCase(),
      createdBy: req.user?._id || null,
    });

    res.status(201).json({ data: complaint });
  } catch (error) {
    next(error);
  }
};
