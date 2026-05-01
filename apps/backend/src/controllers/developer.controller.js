const Developer = require("../models/developer.model");
const ApiUsage = require("../models/apiUsage.model");
const ApiKey = require("../models/apiKey.model");

exports.getMe = async (req, res) => {
  const userId = req.user._id;
  let developer = await Developer.findOne({ userId });
  if (!developer) {
    developer = await Developer.create({ userId });
  }

  res.json({ data: developer });
};

exports.updateMe = async (req, res) => {
  const userId = req.user._id;
  const { organizationName, website, status } = req.body || {};

  const developer = await Developer.findOneAndUpdate(
    { userId },
    {
      organizationName,
      website,
      ...(status ? { status } : {}),
    },
    { returnDocument: "after", upsert: true }
  );

  res.json({ message: "Developer profile updated", data: developer });
};

exports.getUsage = async (req, res) => {
  const developer = await Developer.findOne({ userId: req.user._id });
  if (!developer) return res.status(404).json({ message: "Developer profile not found" });

  const keys = await ApiKey.find({ developerId: developer._id }).select("_id");
  const keyIds = keys.map((key) => key._id);

  const usage = await ApiUsage.aggregate([
    { $match: { apiKeyId: { $in: keyIds } } },
    {
      $group: {
        _id: { date: "$date", path: "$path", method: "$method" },
        count: { $sum: "$count" },
      },
    },
    { $sort: { "_id.date": -1 } },
  ]);

  res.json({ data: usage });
};

