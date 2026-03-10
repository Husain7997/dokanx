const BaseAdsConnector = require("./base.connector");

class YoutubeAdsConnector extends BaseAdsConnector {
  constructor() {
    super("youtube");
  }
}

module.exports = new YoutubeAdsConnector();
