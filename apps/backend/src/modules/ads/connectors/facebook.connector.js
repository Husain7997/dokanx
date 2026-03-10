const BaseAdsConnector = require("./base.connector");

class FacebookAdsConnector extends BaseAdsConnector {
  constructor() {
    super("facebook");
  }
}

module.exports = new FacebookAdsConnector();
