const facebook = require("./facebook.connector");
const google = require("./google.connector");
const youtube = require("./youtube.connector");

function getAdsConnector(platform = "") {
  const key = String(platform || "").toLowerCase();
  if (key === "facebook") return facebook;
  if (key === "google") return google;
  if (key === "youtube") return youtube;

  const err = new Error(`Unsupported ads platform: ${platform}`);
  err.statusCode = 400;
  throw err;
}

module.exports = {
  getAdsConnector,
};
