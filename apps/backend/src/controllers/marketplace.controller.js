const Developer = require("../models/developer.model");
const OAuthApp = require("../models/oauthApp.model");
const AppListing = require("../models/appListing.model");
const AppInstallation = require("../models/appInstallation.model");
const AppReview = require("../models/appReview.model");
const { installApp, uninstallApp } = require("../modules/app-engine/app-engine.service");

exports.listMarketplaceApps = async (_req, res) => {
  const apps = await AppListing.find({ status: "PUBLISHED" }).sort({ createdAt: -1 });
  res.json({ data: apps });
};

exports.publishApp = async (req, res) => {
  const developer = await Developer.findOne({ userId: req.user._id });
  if (!developer) return res.status(404).json({ message: "Developer profile not found" });

  const { appId, tagline, description, categories } = req.body || {};
  const app = await OAuthApp.findOne({ _id: appId, developerId: developer._id });
  if (!app) return res.status(404).json({ message: "OAuth app not found" });

  const listing = await AppListing.findOneAndUpdate(
    { appId: app._id },
    {
      developerId: developer._id,
      name: app.name,
      tagline: tagline || "",
      description: description || "",
      categories: Array.isArray(categories) ? categories : [],
      status: "PUBLISHED",
    },
    { new: true, upsert: true }
  );

  res.json({ message: "App published", data: listing });
};

exports.installApp = async (req, res) => {
  const { appId, shopId, sandboxMode } = req.body || {};
  if (!appId || !shopId) return res.status(400).json({ message: "appId and shopId required" });
  if (req.user?.role !== "ADMIN" && String(req.user?.shopId || "") !== String(shopId)) {
    return res.status(403).json({ message: "Cannot install app for another shop" });
  }

  const installation = await installApp({
    appId,
    shopId,
    installedBy: req.user?._id || null,
    sandboxMode,
  });

  res.json({ message: "App installed", data: installation });
};

exports.uninstallApp = async (req, res) => {
  const { appId, shopId } = req.body || {};
  if (!appId || !shopId) return res.status(400).json({ message: "appId and shopId required" });
  if (req.user?.role !== "ADMIN" && String(req.user?.shopId || "") !== String(shopId)) {
    return res.status(403).json({ message: "Cannot uninstall app for another shop" });
  }

  const installation = await uninstallApp({ appId, shopId });
  res.json({ message: "App uninstalled", data: installation });
};

exports.listReviews = async (req, res) => {
  const { appId } = req.params;
  const reviews = await AppReview.find({ appId }).sort({ createdAt: -1 });
  res.json({ data: reviews });
};

exports.addReview = async (req, res) => {
  const { appId } = req.params;
  const { shopId, rating, comment } = req.body || {};

  if (!shopId || !rating) return res.status(400).json({ message: "shopId and rating required" });

  const review = await AppReview.findOneAndUpdate(
    { appId, shopId, userId: req.user._id },
    { rating, comment: comment || "" },
    { new: true, upsert: true }
  );

  res.json({ message: "Review saved", data: review });
};
