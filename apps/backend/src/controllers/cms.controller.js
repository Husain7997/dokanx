const Page = require("../models/page.model");

exports.listPages = async (req, res) => {
  const shopId = req.shop?._id || req.user?.shopId;
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const pages = await Page.find({ shopId }).sort({ createdAt: -1 }).lean();
  res.json({ data: pages });
};

exports.getPageBySlug = async (req, res) => {
  const shopId = req.shop?._id || req.user?.shopId;
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const { slug } = req.params;
  const page = await Page.findOne({ shopId, slug });
  if (!page) return res.status(404).json({ message: "Page not found" });
  res.json({ data: page });
};

exports.createPage = async (req, res) => {
  const shopId = req.shop?._id || req.user?.shopId;
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const { slug, title, body } = req.body || {};
  if (!slug || !title) return res.status(400).json({ message: "slug and title required" });

  const page = await Page.create({
    shopId,
    slug,
    title,
    body: body || "",
  });

  res.status(201).json({ data: page });
};

exports.updatePage = async (req, res) => {
  const shopId = req.shop?._id || req.user?.shopId;
  if (!shopId) return res.status(400).json({ message: "shopId required" });
  const { pageId } = req.params;
  const { title, body, status } = req.body || {};

  const page = await Page.findOneAndUpdate(
    { _id: pageId, shopId },
    { ...(title ? { title } : {}), ...(body ? { body } : {}), ...(status ? { status } : {}) },
    { returnDocument: "after" }
  );

  if (!page) return res.status(404).json({ message: "Page not found" });
  res.json({ data: page });
};

